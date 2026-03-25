import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PeriodJustificationRepository } from './period-justification.repository';
import { CreatePeriodJustificationDtoInput } from './dtos/create-period-justification.dto.input';
import { GetPeriodJustificationDtoInput } from './dtos/get-period-justification.dto.input';
import { PeriodJustification } from './period-justification.entity';
import { AbsenceJustification } from '../absenceJustification/absence-justification.entity';
import { StudentAttendance } from '../studentAttendance/student-attendance.entity';
import { CollaboratorRepository } from '../../collaborator/collaborator.repository';
import { StudentCourse } from '../../studentCourse/student-course.entity';

@Injectable()
export class PeriodJustificationService {
  constructor(
    private readonly repository: PeriodJustificationRepository,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreatePeriodJustificationDtoInput,
    userId: string,
  ): Promise<PeriodJustification> {
    // Extract YYYY-MM-DD to avoid timezone shifts on date-only columns
    const startDate = dto.startDate.substring(0, 10);
    const endDate = dto.endDate.substring(0, 10);

    if (endDate < startDate) {
      throw new HttpException(
        'Data fim deve ser maior ou igual à data início',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate dates are within the student's course period
    const studentCourse = await this.dataSource
      .getRepository(StudentCourse)
      .findOne({
        where: { id: dto.studentCourseId },
        relations: ['class', 'class.coursePeriod'],
      });

    if (!studentCourse?.class?.coursePeriod) {
      throw new HttpException(
        'Período letivo não encontrado para este aluno',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cpStart = studentCourse.class.coursePeriod.startDate;
    const cpEnd = studentCourse.class.coursePeriod.endDate;
    const periodStart =
      cpStart instanceof Date
        ? cpStart.toISOString().substring(0, 10)
        : String(cpStart).substring(0, 10);
    const periodEnd =
      cpEnd instanceof Date
        ? cpEnd.toISOString().substring(0, 10)
        : String(cpEnd).substring(0, 10);

    if (startDate < periodStart || endDate > periodEnd) {
      throw new HttpException(
        `As datas devem estar dentro do período letivo (${periodStart} a ${periodEnd})`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const collaborator =
      await this.collaboratorRepository.findOneByUserId(userId);
    if (!collaborator) {
      throw new HttpException(
        'Colaborador não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Entire operation is transactional: overlap check + create + retroactive apply
    return this.dataSource.transaction(async (manager) => {
      const pjRepo = manager.getRepository(PeriodJustification);
      const saRepo = manager.getRepository(StudentAttendance);
      const ajRepo = manager.getRepository(AbsenceJustification);

      // 1. Overlap check inside transaction (prevents TOCTOU race)
      const overlapping = await pjRepo
        .createQueryBuilder('pj')
        .where('pj.student_course_id = :studentCourseId', {
          studentCourseId: dto.studentCourseId,
        })
        .andWhere('pj.start_date <= :endDate', { endDate: dto.endDate })
        .andWhere('pj.end_date >= :startDate', { startDate: dto.startDate })
        .andWhere('pj.deleted_at IS NULL')
        .getMany();

      if (overlapping.length > 0) {
        const existing = overlapping[0];
        throw new HttpException(
          `Já existe uma justificativa de período que conflita: ${existing.startDate} a ${existing.endDate}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Create PeriodJustification
      const periodJustification = pjRepo.create({
        studentCourse: { id: dto.studentCourseId },
        startDate,
        endDate,
        justification: dto.justification,
        createdBy: collaborator,
      });
      const saved = await pjRepo.save(periodJustification);

      // 3. Retroactive: find absent StudentAttendance without justification in range
      const absentRecords = await saRepo
        .createQueryBuilder('sa')
        .leftJoinAndSelect('sa.justification', 'aj')
        .innerJoin('sa.attendanceRecord', 'ar')
        .where('sa.studentCourse = :studentCourseId', {
          studentCourseId: dto.studentCourseId,
        })
        .andWhere('sa.present = false')
        .andWhere('aj.id IS NULL')
        .andWhere('DATE(ar.registeredAt) >= :startDate', {
          startDate: dto.startDate,
        })
        .andWhere('DATE(ar.registeredAt) <= :endDate', {
          endDate: dto.endDate,
        })
        .getMany();

      // 4. Create AbsenceJustification for each
      if (absentRecords.length > 0) {
        const justifications = absentRecords.map((sa) =>
          ajRepo.create({
            studentAttendance: sa,
            justification: dto.justification,
          }),
        );
        await ajRepo.save(justifications);
      }

      return saved;
    });
  }

  async findAll(dto: GetPeriodJustificationDtoInput) {
    const { data, totalItems } = await this.repository.findPaginated(
      dto.studentCourseId,
      dto.page,
      dto.limit,
    );

    return {
      data: data.map((pj) => ({
        id: pj.id,
        startDate: pj.startDate,
        endDate: pj.endDate,
        justification: pj.justification,
        createdBy: {
          name: pj.createdBy?.user
            ? `${pj.createdBy.user.firstName} ${pj.createdBy.user.lastName}`
            : 'Desconhecido',
        },
        createdAt: pj.createdAt,
      })),
      totalItems,
      page: dto.page,
      limit: dto.limit,
    };
  }

  async count(studentCourseId: string): Promise<number> {
    return this.repository.countByStudentCourse(studentCourseId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const pj = await this.repository.findById(id);
    if (!pj) {
      throw new HttpException(
        'Justificativa de período não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    const collaborator =
      await this.collaboratorRepository.findOneByUserId(userId);
    if (!collaborator) {
      throw new HttpException(
        'Colaborador não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Soft delete
    pj.deletedAt = new Date();
    await this.dataSource.getRepository(PeriodJustification).save(pj);
  }
}
