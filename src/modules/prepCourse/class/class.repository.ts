import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { AttendanceRecord } from '../attendance/attendanceRecord/attendance-record.entity';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { Class } from './class.entity';

@Injectable()
export class ClassRepository extends BaseRepository<Class> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Class));
  }

  async delete(id: string): Promise<void> {
    const classEntity = await this.repository.findOneBy({ id });
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    classEntity.deletedAt = new Date();
    await this.repository.save(classEntity);
  }

  override async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<Class>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .leftJoin('entity.students', 'student_course')
        .addSelect('student_course.id')
        .leftJoinAndSelect('entity.coursePeriod', 'course_period')
        .getMany(),
      this.repository
        .createQueryBuilder('entity')
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  async findOneById(id: string): Promise<Class> {
    return this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.students', 'student_course')
      .leftJoin('student_course.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.email',
        'user.birthday',
        'user.useSocialName',
      ])
      .leftJoinAndSelect('entity.admins', 'admins')
      .leftJoinAndSelect('entity.coursePeriod', 'course_period')
      .where('entity.id = :id', { id })
      .getOne();
  }

  async findOneByIdToAttendanceRecord(id: string): Promise<Class> {
    return this.repository
      .createQueryBuilder('entity')
      .leftJoin('entity.students', 'student_course')
      .addSelect([
        'student_course.id',
        'student_course.userId',
        'student_course.cod_enrolled',
        'student_course.applicationStatus',
      ])
      .leftJoin('student_course.user', 'user')
      .addSelect([
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.useSocialName',
      ])
      .leftJoinAndSelect('entity.coursePeriod', 'course_period')
      .where('entity.id = :id', { id })
      .andWhere(`student_course.applicationStatus = :status`, {
        status: StatusApplication.Enrolled,
      })
      .getOne();
  }

  async countAttendanceRecords(classId: string): Promise<number> {
    const attendanceRepo = this._entityManager.getRepository(AttendanceRecord);
    return attendanceRepo
      .createQueryBuilder('ar')
      .where('ar.class = :classId', { classId })
      .andWhere('ar.deletedAt IS NULL')
      .getCount();
  }

  async findOneByIdWithCoursePeriod(id: string): Promise<Class> {
    return this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.coursePeriod', 'course_period')
      .where('entity.id = :id', { id })
      .getOne();
  }

  async findOneByIdWithPartner(id: string): Promise<Class> {
    return this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.partnerPrepCourse', 'partner_prep_course')
      .addSelect(['partner_prep_course.id'])
      .leftJoinAndSelect('entity.coursePeriod', 'course_period')
      .where('entity.id = :id', { id })
      .getOne();
  }

  async getPresenceByClassId(
    classId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Map<
      string,
      {
        presencePercentage: number;
        absencePercentage: number;
        justifiedAbsencePercentage: number;
      }
    >
  > {
    const endDateCopy = new Date(endDate);
    endDateCopy.setDate(endDateCopy.getDate() + 1);

    const attendanceRepo = this._entityManager.getRepository(AttendanceRecord);

    const raw = await attendanceRepo
      .createQueryBuilder('ar')
      .innerJoin('ar.studentAttendance', 'sa')
      .innerJoin('sa.studentCourse', 'sc')
      .leftJoin('sa.justification', 'aj')
      .where('ar.class = :classId', { classId })
      .andWhere('ar.registeredAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endDateCopy,
      })
      .andWhere('ar.deletedAt IS NULL')
      .select('sc.id', 'studentCourseId')
      .addSelect(
        `ROUND(100.0 * SUM(CASE WHEN sa.present = true THEN 1 ELSE 0 END) / COUNT(sa.id), 2)`,
        'presencePercentage',
      )
      .addSelect(
        `ROUND(100.0 * SUM(CASE WHEN sa.present = false AND aj.id IS NULL THEN 1 ELSE 0 END) / COUNT(sa.id), 2)`,
        'absencePercentage',
      )
      .addSelect(
        `ROUND(100.0 * SUM(CASE WHEN sa.present = false AND aj.id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(sa.id), 2)`,
        'justifiedAbsencePercentage',
      )
      .groupBy('sc.id')
      .getRawMany();

    const map = new Map<
      string,
      {
        presencePercentage: number;
        absencePercentage: number;
        justifiedAbsencePercentage: number;
      }
    >();
    for (const row of raw) {
      const presence = parseFloat(row.presencePercentage);
      const justified = parseFloat(row.justifiedAbsencePercentage);
      // Garantir que a soma = 100%
      const absence = parseFloat((100 - presence - justified).toFixed(2));
      map.set(row.studentCourseId, {
        presencePercentage: presence,
        absencePercentage: absence,
        justifiedAbsencePercentage: justified,
      });
    }
    return map;
  }
}
