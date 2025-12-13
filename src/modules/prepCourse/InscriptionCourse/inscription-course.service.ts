import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { Gender } from 'src/modules/user/enum/gender';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { adjustDate } from 'src/utils/adjustDate';
import { maskCpf } from 'src/utils/maskCpf';
import { maskRg } from 'src/utils/maskRg';
import { HasInscriptionActiveDtoOutput } from '../partnerPrepCourse/dtos/has-inscription-active.output.dto';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { LogStudent } from '../studentCourse/log-student/log-student.entity';
import { LogStudentRepository } from '../studentCourse/log-student/log-student.repository';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { CreateInscriptionCourseInput } from './dtos/create-inscription-course.dto.input';
import { ExtendInscriptionCourseDtoInput } from './dtos/extend-inscription-course.dto.input';
import { InscriptionCourseDtoOutput } from './dtos/get-all-inscription.dto.output';
import { GetAllWithNameDtoOutput } from './dtos/get-all-with-name';
import { GetSubscribersDtoOutput } from './dtos/get-subscribers.dto.output';
import { UpdateInscriptionCourseDTOInput } from './dtos/update-inscription-course.dto.input';
import { InscriptionCourse } from './inscription-course.entity';
import { InscriptionCourseRepository } from './inscription-course.repository';

@Injectable()
export class InscriptionCourseService extends BaseService<InscriptionCourse> {
  constructor(
    private readonly repository: InscriptionCourseRepository,
    private readonly studentRepository: StudentCourseRepository,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
    private readonly emailService: EmailService,
    private readonly logStudentRepository: LogStudentRepository,
    private readonly discordWebhook: DiscordWebhook,
    private readonly cache: CacheService,
    private readonly formService: FormService,
  ) {
    super(repository);
  }

  async create(
    dto: CreateInscriptionCourseInput,
    userId: string,
  ): Promise<InscriptionCourseDtoOutput> {
    if (new Date(dto.endDate) < new Date()) {
      throw new HttpException(
        'Data de término do curso não pode ser menor que a data atual',
        HttpStatus.BAD_REQUEST,
      );
    }
    const parnetPrepCourse =
      await this.partnerPrepCourseService.getByUserId(userId);

    const hasActiveForm = await this.formService.hasActiveForm();
    if (!hasActiveForm) {
      throw new HttpException(
        'Não existe um formulário ativo - Entre em contato com o suporte',
        HttpStatus.BAD_REQUEST,
      );
    }

    dto.endDate = new Date(dto.endDate);
    dto.startDate = new Date(dto.startDate);
    dto.startDate.setHours(0, 0, 0, 0);
    dto.endDate.setHours(23, 59, 59, 999);

    const inscriptionCourse: InscriptionCourse = Object.assign(
      new InscriptionCourse(),
      dto,
    );

    if (dto.startDate < new Date()) {
      inscriptionCourse.actived = Status.Approved;
    }

    inscriptionCourse.description = dto.description || '';
    inscriptionCourse.partnerPrepCourse = parnetPrepCourse;
    const result = await this.repository.create(inscriptionCourse);
    await this.formService.createFormFull(result.id);
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      startDate: result.startDate,
      endDate: result.endDate,
      actived: result.actived,
      openingsCount: result.expectedOpening,
      subscribersCount: 0,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      partnerPrepCourseId: parnetPrepCourse.id,
      partnerPrepCourseName: parnetPrepCourse.geo.name,
      requestDocuments: result.requestDocuments,
    };
  }

  async getAll(
    page: number,
    limit: number,
    userId: string,
  ): Promise<GetAllOutput<InscriptionCourseDtoOutput>> {
    const partner = await this.partnerPrepCourseService.getByUserId(userId);

    const inscription = await this.repository.findAllBy({
      page: page,
      limit: limit,
      where: { partnerPrepCourse: partner },
    });
    return {
      data: inscription.data.map((i) =>
        Object.assign(new InscriptionCourseDtoOutput(), {
          id: i.id,
          name: i.name,
          description: i.description,
          startDate: i.startDate,
          endDate: i.endDate,
          actived: i.actived,
          openingsCount: i.expectedOpening,
          subscribersCount: i.students?.length || 0,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
          partnerPrepCourseId: i.partnerPrepCourse.id,
          partnerPrepCourseName: i.partnerPrepCourse.geo.name,
          requestDocuments: i.requestDocuments,
        }),
      ),
      page: inscription.page,
      limit: inscription.limit,
      totalItems: inscription.totalItems,
    };
  }

  async getAllWithName(userId: string): Promise<GetAllWithNameDtoOutput[]> {
    const partner = await this.partnerPrepCourseService.getByUserId(userId);

    const inscription = await this.repository.findAllWithName(partner.id);

    return inscription
      .filter(
        (i) =>
          i.students.length > 0 &&
          (i.students.some(
            (s) => s.applicationStatus === StatusApplication.Enrolled,
          ) ||
            i.students.some(
              (s) =>
                s.applicationStatus === StatusApplication.EnrollmentCancelled,
            ) ||
            i.students.some(
              (s) => s.applicationStatus === StatusApplication.EnrollmentClosed,
            )),
      )
      .map((i) => ({
        id: i.id,
        name: i.name,
        startDate: i.startDate,
        endDate: i.endDate,
        createdAt: i.createdAt,
      }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .reverse();
  }

  async getById(id: string): Promise<InscriptionCourse> {
    return await this.repository.findOneBy({ id });
  }

  async getToInscription(id: string): Promise<HasInscriptionActiveDtoOutput> {
    const inscription = await this.repository.findOneBy({ id });
    if (!inscription) {
      throw new HttpException(
        'Processo Seletivo não encontrado',
        HttpStatus.BAD_REQUEST,
      );
    }
    const today = new Date();
    const status =
      today < inscription.startDate
        ? Status.Pending
        : today > inscription.endDate
          ? Status.Rejected
          : Status.Approved;
    const partnerPrepForm =
      await this.formService.getFormFullByInscriptionId(id);
    return Object.assign(new HasInscriptionActiveDtoOutput(), {
      prepCourseName: inscription.partnerPrepCourse.geo.name,
      prepCourseId: inscription.partnerPrepCourse.id,
      inscription: {
        name: inscription.name,
        description: inscription.description,
        startDate: inscription.startDate,
        endDate: inscription.endDate,
        status:
          inscription.actived === Status.Rejected ? Status.Rejected : status,
      },
      partnerPrepForm,
    });
  }

  async cancelInscriptionCourse(id: string) {
    const inscriptionCourse = await this.repository.findOneBy({ id });
    if (!inscriptionCourse) {
      throw new HttpException(
        'Processo Seletivo não encontrado',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (inscriptionCourse.students.length > 0) {
      throw new HttpException(
        'Não é possível cancelar o processo seletivo com estudantes inscritos',
        HttpStatus.BAD_REQUEST,
      );
    }
    inscriptionCourse.actived = Status.Rejected;
    inscriptionCourse.deletedAt = new Date();
    await this.repository.update(inscriptionCourse);
  }

  async update(entity: InscriptionCourse) {
    return this.repository.update(entity);
  }
  async updateFromDTO(dto: UpdateInscriptionCourseDTOInput) {
    const inscriptionCourse = await this.repository.findOneBy({ id: dto.id });
    if (!inscriptionCourse) {
      throw new HttpException(
        'Processo Seletivo não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Normalizar a data atual para meia-noite para comparação
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Normalizar as datas existentes no banco para meia-noite
    const currentStartDate = new Date(inscriptionCourse.startDate);
    currentStartDate.setHours(0, 0, 0, 0);
    const currentEndDate = new Date(inscriptionCourse.endDate);
    currentEndDate.setHours(0, 0, 0, 0);

    // Normalizar as novas datas do DTO para meia-noite
    const newStartDate = new Date(dto.startDate);
    newStartDate.setHours(0, 0, 0, 0);
    const newEndDate = new Date(dto.endDate);
    newEndDate.setHours(0, 0, 0, 0);

    // Verificar se a data de fim é válida
    if (newEndDate < now) {
      throw new HttpException(
        'Data de término do curso não pode ser menor que a data atual',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar o estado atual do processo seletivo
    const hasStarted = currentStartDate <= now;
    const hasEnded = currentEndDate < now;

    // Aplicar regras de validação conforme o estado
    if (hasEnded) {
      // Processo já terminou - não pode alterar nenhuma data
      if (
        newStartDate.getTime() !== currentStartDate.getTime() ||
        newEndDate.getTime() !== currentEndDate.getTime()
      ) {
        throw new HttpException(
          'Não é possível alterar as datas de um processo seletivo já finalizado',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else if (hasStarted) {
      // Processo já começou mas ainda não terminou - não pode alterar data de início
      if (newStartDate.getTime() !== currentStartDate.getTime()) {
        throw new HttpException(
          'Não é possível alterar a data de início de um processo seletivo em andamento',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Preparar as datas finais (startDate com horário 00:00:00 e endDate com 23:59:59)
    const startDate = new Date(newStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(newEndDate);
    endDate.setHours(23, 59, 59, 999);

    // Definir o status baseado na nova data de início
    if (startDate <= now) {
      inscriptionCourse.actived = Status.Approved;
    } else {
      inscriptionCourse.actived = Status.Pending;
    }

    Object.assign(inscriptionCourse, {
      name: dto.name,
      description: dto.description,
      startDate,
      endDate,
      expectedOpening: dto.expectedOpening,
      requestDocuments: dto.requestDocuments,
    });

    await this.repository.update(inscriptionCourse);
  }

  async extendInscription(id: string, dto: ExtendInscriptionCourseDtoInput) {
    const inscriptionCourse = await this.repository.findOneBy({ id });
    if (!inscriptionCourse) {
      throw new HttpException(
        'Processo Seletivo não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Normalizar a data atual para meia-noite para comparação
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Normalizar a data existente no banco para meia-noite
    const currentEndDate = new Date(inscriptionCourse.endDate);
    currentEndDate.setHours(0, 0, 0, 0);

    // Normalizar a nova data do DTO para meia-noite
    const newEndDate = new Date(dto.endDate);
    newEndDate.setHours(0, 0, 0, 0);

    // Verificar se a nova data de término é válida (deve ser no futuro)
    if (newEndDate < now) {
      throw new HttpException(
        'Data de término não pode ser menor que a data atual',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar se a nova data é posterior à data atual
    if (newEndDate <= currentEndDate) {
      throw new HttpException(
        'A nova data de término deve ser posterior à data atual de término',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Preparar a data final (com horário 23:59:59)
    const endDate = new Date(newEndDate);
    endDate.setHours(23, 59, 59, 999);

    // Normalizar a data de início para verificar status
    const startDate = new Date(inscriptionCourse.startDate);
    startDate.setHours(0, 0, 0, 0);

    // Atualizar o status baseado na data de início
    if (startDate <= now) {
      inscriptionCourse.actived = Status.Approved;
    } else {
      inscriptionCourse.actived = Status.Pending;
    }

    Object.assign(inscriptionCourse, {
      endDate,
    });

    await this.repository.update(inscriptionCourse);
  }

  async getSubscribers(
    inscriptionId: string,
  ): Promise<GetSubscribersDtoOutput[]> {
    const inscription = await this.repository.getSubscribers(inscriptionId);
    if (!inscription) {
      throw new HttpException(
        'Processo Seletivo não encontrado',
        HttpStatus.BAD_REQUEST,
      );
    }
    const subscribers: GetSubscribersDtoOutput[] = inscription.students.map(
      (student) => {
        return Object.assign(new GetSubscribersDtoOutput(), {
          id: student.id,
          cadastrado_em: student.createdAt,
          isento: student.isFree ? 'Sim' : 'Não',
          convocar: student.selectEnrolled ? 'Sim' : 'Não',
          data_convocacao: student.selectEnrolledAt,
          data_limite_convocacao: student.limitEnrolledAt
            ? adjustDate(student.limitEnrolledAt, -1)
            : null,
          lista_de_espera: student.waitingList ? 'Sim' : 'Não',
          status: student.applicationStatus,
          email: student.user.email,
          cpf: student.cpf,
          rg: student.rg,
          uf: student.uf,
          telefone_emergencia: student.urgencyPhone,
          socioeconomic: student.socioeconomic,
          whatsapp: student.whatsapp,
          nome: student.user.firstName,
          sobrenome: student.user.lastName,
          nome_social: student.user.socialName,
          usar_nome_social: student.user.useSocialName,
          data_nascimento: student.user.birthday,
          genero:
            student.user.gender === Gender.Male
              ? 'Masculino'
              : student.user.gender === Gender.Female
                ? 'Feminino'
                : 'Outro',
          telefone: student.user.phone,
          bairro: student.user.neighborhood,
          rua: student.user.street,
          numero: student.user.number,
          complemento: student.user.complement,
          CEP: student.user.postalCode,
          cidade: student.user.city,
          estado: student.user.state,
          nome_guardiao_legal: student.legalGuardian?.fullName || '',
          telefone_guardiao_legal: student.legalGuardian?.phone || '',
          rg_guardiao_legal: maskRg(student.legalGuardian?.rg) || '',
          uf_guardiao_legal: student.legalGuardian?.uf || '',
          cpf_guardiao_legal: maskCpf(student.legalGuardian?.cpf) || '',
          parentesco_guardiao_legal:
            student.legalGuardian?.family_relationship || '',
          logs: student.logs,
          documents: student.documents.map((d) => ({
            createdAt: d.createdAt,
            name: d.name,
            key: d.key,
            expiredAt: d.exprires,
          })),
          photo: student.photo,
          areas_de_interesse: student.areaInterest,
          cursos_selecionados: student.selectedCourses,
        });
      },
    );
    return subscribers;
  }

  @Cron(CronExpression.EVERY_3_HOURS, {
    timeZone: 'America/Sao_Paulo',
  })
  async updateInfosInscription() {
    try {
      await this.repository.updateAllInscriptionsStatus();
    } catch (error) {
      this.discordWebhook.sendMessage(
        `Erro ao atualizar status das inscrições: ${error}`,
      );
    }
  }

  async updateWaitingList(id: string, studentId: string, waitingList: boolean) {
    const inscription = await this.repository.findOneBy({ id });
    if (!inscription) {
      throw new HttpException(
        'Processo Seletivo não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.Enrolled) {
      throw new HttpException(
        'Não é possível alterar status de lista de espera de estudantes matriculados',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      student.applicationStatus === StatusApplication.UnderReview ||
      (student.applicationStatus === StatusApplication.CalledForEnrollment &&
        new Date() < new Date(student.selectEnrolledAt))
    ) {
      const log = new LogStudent();
      log.studentId = student.id;
      log.applicationStatus = StatusApplication.UnderReview;
      student.applicationStatus = StatusApplication.UnderReview;
      if (!waitingList) {
        student.waitingList = false;
        log.description = 'Removeu estudante da lista de espera';
        await this.removeStudentWaitingList(student, inscription);
      } else {
        log.description = 'Adicionou estudante na lista de espera';
        student.waitingList = true;
        student.selectEnrolled = false;
        await this.addStudentWaitingList(student, inscription);
      }
      await this.logStudentRepository.create(log);
    } else {
      throw new HttpException(
        'Não é possível alterar informações do estudantes. Status Block',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async removeStudentWaitingList(
    student: StudentCourse,
    inscription: InscriptionCourse,
  ) {
    await this.repository.removeNode(inscription, student);
  }

  async addStudentWaitingList(
    student: StudentCourse,
    inscription: InscriptionCourse,
  ) {
    await this.repository.addList(student, inscription);
  }

  async updateOrderWaitingList(id: string, studentsId: string[]) {
    if (studentsId.length > 0) {
      const inscription = await this.repository.findOneBy({ id });
      if (!inscription) {
        throw new HttpException(
          'Processo Seletivo não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      inscription.head = studentsId[0];
      await Promise.all(
        studentsId.map(async (studentId, index) => {
          const student = await this.studentRepository.findOneBy({
            id: studentId,
          });
          student.prev = index > 0 ? studentsId[index - 1] : null;
          student.next =
            index < studentsId.length - 1 ? studentsId[index + 1] : null;

          await this.studentRepository.update(student);
        }),
      );
      if (studentsId.length > 1) {
        inscription.tail = studentsId[studentsId.length - 1];
      } else {
        inscription.tail = studentsId[0];
      }
      inscription.lenght = studentsId.length;
      await this.repository.update(inscription);
    }
  }

  async getWaitingList(id: string) {
    return await this.repository.getWaitingList(id);
  }

  async sendEmailWaitingList(id: string) {
    const inscription = await this.repository.findOneBy({ id });
    const list = await this.repository.getWaitingList(id);
    await this.emailService.sendWaitingList(
      list,
      inscription.partnerPrepCourse.geo.name,
    );
    await Promise.all(
      list.map(async (student) => {
        const log = new LogStudent();
        log.studentId = student.id;
        log.applicationStatus = StatusApplication.UnderReview;
        log.description = 'Enviou email de lista de espera';
        await this.logStudentRepository.create(log);
      }),
    );
  }

  async getSummary() {
    const inscriptionTotal = await this.cache.wrap<number>(
      'inscription:total',
      async () => this.repository.getTotalEntity(),
    );
    const inscriptionPending = await this.cache.wrap<number>(
      'inscription:pending',
      async () => this.repository.entityByStatus(Status.Pending),
    );
    const inscriptionApproved = await this.cache.wrap<number>(
      'inscription:approved',
      async () => this.repository.entityByStatus(Status.Approved),
    );
    const inscriptionRejected = await this.cache.wrap<number>(
      'inscription:rejected',
      async () => this.repository.entityByStatus(Status.Rejected),
    );

    return {
      inscriptionTotal,
      inscriptionPending,
      inscriptionApproved,
      inscriptionRejected,
    };
  }
}
