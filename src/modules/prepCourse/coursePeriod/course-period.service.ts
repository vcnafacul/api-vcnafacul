import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { Not } from 'typeorm';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
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
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly discordWebhook: DiscordWebhook,
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

    // Verificar se já existe um período com o mesmo ano para o mesmo parceiro
    const existingPeriod = await this.repository.findOneBy({
      year: year,
      partnerPrepCourse: { id: partnerPrepCourse.id },
    });

    if (existingPeriod) {
      throw new HttpException(
        'A course period for this year already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

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
    };
  }

  async findOneById(
    id: string,
    userId: string,
  ): Promise<CoursePeriodDtoOutput> {
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);
    const coursePeriod = await this.repository.findOneById(id);

    if (coursePeriod.partnerPrepCourse.id !== partnerPrepCourse?.id) {
      throw new HttpException(
        `Course period with id ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!coursePeriod) {
      throw new NotFoundException(`Course period with id ${id} not found`);
    }

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
    };
  }

  async update(dto: UpdateCoursePeriodDtoInput): Promise<void> {
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

    // Se está atualizando a data de início, extrair o novo ano e verificar conflitos
    if (dto.startDate) {
      const newStartDate = new Date(dto.startDate);
      const newYear = newStartDate.getFullYear();

      if (newYear !== coursePeriod.year) {
        const existingPeriod = await this.repository.findOneBy({
          year: newYear,
          partnerPrepCourse: { id: coursePeriod.partnerPrepCourse.id },
          id: Not(dto.id),
        });

        if (existingPeriod) {
          throw new HttpException(
            'A course period for this year already exists',
            HttpStatus.BAD_REQUEST,
          );
        }
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

  async delete(id: string): Promise<void> {
    const coursePeriod = await this.repository.findOneById(id);

    if (!coursePeriod) {
      throw new HttpException(
        `Course period not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
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
    const coursePeriods = await this.repository.findAllBy({
      page,
      limit,
      where: {},
    });

    // Filtrar apenas períodos do parceiro do usuário
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);

    const filteredPeriods = coursePeriods.data.filter(
      (period) => period.partnerPrepCourse.id === partnerPrepCourse.id,
    );

    return {
      data: filteredPeriods.map((period) => ({
        id: period.id,
        name: period.name,
        year: period.year,
        startDate: period.startDate,
        endDate: period.endDate,
        partnerPrepCourseId: period.partnerPrepCourse.id,
        classesCount: period.classes?.length || 0,
        createdAt: period.createdAt,
        updatedAt: period.updatedAt,
      })),
      page: coursePeriods.page,
      limit: coursePeriods.limit,
      totalItems: filteredPeriods.length,
    };
  }

  async getByUserId(userId: string): Promise<CoursePeriod[]> {
    return await this.repository.findOneByUserId(userId);
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
        // Coletar todos os IDs dos estudantes das turmas deste período
        const studentIds: string[] = [];

        for (const classEntity of period.classes || []) {
          for (const studentCourse of classEntity.students || []) {
            // Só atualizar estudantes que não estão já com status de matrícula encerrada
            if (
              studentCourse.applicationStatus !==
              StatusApplication.EnrollmentClosed
            ) {
              studentIds.push(studentCourse.id);
            }
          }
        }

        if (studentIds.length > 0) {
          // Atualizar status dos estudantes para "Matrícula Encerrada"
          await this.studentCourseRepository.updateStudentStatus(
            studentIds,
            StatusApplication.EnrollmentClosed,
          );

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
}
