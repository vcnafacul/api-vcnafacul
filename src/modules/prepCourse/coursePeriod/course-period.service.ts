import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { LogStudent } from '../studentCourse/log-student/log-student.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { CoursePeriod } from './course-period.entity';
import { CoursePeriodRepository } from './course-period.repository';
import { CoursePeriodDtoOutput } from './dtos/course-period.dto.output';
import { CreateCoursePeriodDtoInput } from './dtos/create-course-period.dto.input';
import { UpdateCoursePeriodDtoInput } from './dtos/update-course-period.dto.input';

@Injectable()
export class CoursePeriodService extends BaseService<CoursePeriod> {
  constructor(
    private readonly repository: CoursePeriodRepository,
    private readonly partnerRepository: PartnerPrepCourseRepository,
    private readonly discordWebhook: DiscordWebhook,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super(repository);
  }

  async create(
    dto: CreateCoursePeriodDtoInput,
    userId: string,
  ): Promise<CoursePeriodDtoOutput> {
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);

    if (!partnerPrepCourse) {
      throw new HttpException(
        'Partner prep course not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Validar se as datas são válidas
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new HttpException(
        'Start date must be before end date',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Extrair o ano da data de início
    const year = startDate.getFullYear();

    const coursePeriod = new CoursePeriod();
    coursePeriod.name = dto.name;
    coursePeriod.year = year;
    coursePeriod.startDate = startDate;
    coursePeriod.endDate = endDate;
    coursePeriod.partnerPrepCourse = partnerPrepCourse;

    const result = await this.repository.create(coursePeriod);

    return {
      id: result.id,
      name: result.name,
      year: result.year,
      startDate: result.startDate,
      endDate: result.endDate,
      partnerPrepCourseId: result.partnerPrepCourse.id,
      classesCount: 0,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      classes: [],
    };
  }

  /**
   * O período, só se for do cursinho de quem pede. De outro cursinho responde
   * 404, igual a inexistente — confirmar que o id existe já seria vazar.
   */
  private async periodoDoCursinho(id: string, userId: string) {
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);
    const coursePeriod = await this.repository.findOneById(id);
    if (
      !partnerPrepCourse ||
      !coursePeriod ||
      coursePeriod.partnerPrepCourse?.id !== partnerPrepCourse.id
    ) {
      throw new NotFoundException(`Course period with id ${id} not found`);
    }
    return coursePeriod;
  }

  async findOneById(
    id: string,
    userId: string,
  ): Promise<CoursePeriodDtoOutput> {
    // Antes lia `coursePeriod.partnerPrepCourse` antes de checar se existia:
    // id inexistente dava 500.
    const coursePeriod = await this.periodoDoCursinho(id, userId);

    return {
      id: coursePeriod.id,
      name: coursePeriod.name,
      year: coursePeriod.year,
      startDate: coursePeriod.startDate,
      endDate: coursePeriod.endDate,
      partnerPrepCourseId: coursePeriod.partnerPrepCourse.id,
      classesCount: coursePeriod.classes?.length || 0,
      createdAt: coursePeriod.createdAt,
      updatedAt: coursePeriod.updatedAt,
      classes: coursePeriod.classes.map((classEntity) => ({
        id: classEntity.id,
        name: classEntity.name,
        description: classEntity.description,
        number_students: classEntity.students.length,
      })),
    };
  }

  async update(dto: UpdateCoursePeriodDtoInput, userId: string): Promise<void> {
    await this.periodoDoCursinho(dto.id, userId);
    const coursePeriod = await this.repository.findOneBy({ id: dto.id });

    if (!coursePeriod) {
      throw new HttpException(
        `Course period not found by id ${dto.id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Se está atualizando datas, validar
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate
        ? new Date(dto.startDate)
        : coursePeriod.startDate;
      const endDate = dto.endDate
        ? new Date(dto.endDate)
        : coursePeriod.endDate;

      if (startDate >= endDate) {
        throw new HttpException(
          'Start date must be before end date',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Determinar o ano final baseado na data de início atualizada ou atual
    const finalStartDate = dto.startDate
      ? new Date(dto.startDate)
      : coursePeriod.startDate;
    const finalYear = finalStartDate.getFullYear();

    Object.assign(coursePeriod, {
      name: dto.name ?? coursePeriod.name,
      year: finalYear,
      startDate: dto.startDate ?? coursePeriod.startDate,
      endDate: dto.endDate ?? coursePeriod.endDate,
    });

    await this.repository.update(coursePeriod);
  }

  /** Exclusão pela rota: só período do cursinho de quem pede e sem turmas. */
  async excluirDoCursinho(id: string, userId: string): Promise<void> {
    const coursePeriod = await this.periodoDoCursinho(id, userId);
    if (coursePeriod.classes && coursePeriod.classes.length > 0) {
      throw new HttpException(
        `Course period with id ${id} has classes, cannot be deleted`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.repository.delete(id);
  }

  async getAll(
    page: number,
    limit: number,
    userId: string,
  ): Promise<GetAllOutput<CoursePeriodDtoOutput>> {
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);

    const coursePeriods = await this.repository.findAllByPartner(
      page,
      limit,
      partnerPrepCourse.id,
    );

    return {
      data: coursePeriods.data.map((period) => ({
        id: period.id,
        name: period.name,
        year: period.year,
        startDate: period.startDate,
        endDate: period.endDate,
        partnerPrepCourseId: period.partnerPrepCourse.id,
        classesCount: period.classes?.length || 0,
        createdAt: period.createdAt,
        updatedAt: period.updatedAt,
        classes: period.classes.map((classEntity) => ({
          id: classEntity.id,
          name: classEntity.name,
          description: classEntity.description,
          number_students: classEntity.students?.length || 0,
        })),
      })),
      page: coursePeriods.page,
      limit: coursePeriods.limit,
      totalItems: coursePeriods.totalItems,
    };
  }

  async getYears(userId: string): Promise<number[]> {
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);

    if (!partnerPrepCourse) {
      throw new HttpException(
        'Partner prep course not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return await this.repository.findDistinctYearsByPartner(
      partnerPrepCourse.id,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/Sao_Paulo',
  })
  async closeExpiredCoursePeriods() {
    try {
      const expiredPeriods = await this.repository.findExpiredPeriods();

      if (expiredPeriods.length === 0) {
        return;
      }

      let totalStudentsUpdated = 0;

      for (const period of expiredPeriods) {
        // Só encerra quem está matriculado. Cancelado, não confirmado etc.
        // continuam como estão: sobrescrever o cancelamento apagava a evasão
        // do status (tickets/033, card 00).
        const studentIds: string[] = [];

        for (const classEntity of period.classes || []) {
          for (const studentCourse of classEntity.students || []) {
            if (
              !studentCourse.deletedAt &&
              studentCourse.applicationStatus === StatusApplication.Enrolled
            ) {
              studentIds.push(studentCourse.id);
            }
          }
        }

        if (studentIds.length > 0) {
          await this.encerrarMatriculas(studentIds, period);

          totalStudentsUpdated += studentIds.length;

          this.discordWebhook.sendMessage(
            `📚 Período letivo "${period.name}" (${period.year}) encerrado. ` +
              `${studentIds.length} estudantes tiveram o status alterado para "Matrícula Encerrada".`,
          );
        }
      }

      if (totalStudentsUpdated > 0) {
        this.discordWebhook.sendMessage(
          `✅ Processo de encerramento de períodos letivos concluído. ` +
            `Total de estudantes atualizados: ${totalStudentsUpdated}`,
        );
      }
    } catch (error) {
      this.discordWebhook.sendMessage(
        `❌ Erro ao processar encerramento de períodos letivos: ${error.message}`,
      );
    }
  }

  /**
   * Encerra as matrículas e grava no histórico de cada estudante o motivo —
   * antes o status mudava sem log, e o histórico não explicava o "Encerrada".
   */
  private async encerrarMatriculas(studentIds: string[], period: CoursePeriod) {
    const description = `Matrícula encerrada pelo fim do período letivo "${period.name}" (${period.year})`;
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        StudentCourse,
        { id: In(studentIds) },
        {
          applicationStatus: StatusApplication.EnrollmentClosed,
          updatedAt: new Date(),
        },
      );
      await manager.save(
        LogStudent,
        studentIds.map((studentId) =>
          manager.create(LogStudent, {
            studentId,
            applicationStatus: StatusApplication.EnrollmentClosed,
            description,
          }),
        ),
      );
    });
  }
}
