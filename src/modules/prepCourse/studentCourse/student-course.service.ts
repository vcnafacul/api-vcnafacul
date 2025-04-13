import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import { Permissions } from 'src/modules/role/role.entity';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { CreateUserDtoInput } from 'src/modules/user/dto/create.dto.input';
import { CreateFlow } from 'src/modules/user/enum/create-flow';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import {
  Filter,
  GetAllInput,
  Sort,
} from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { IsNull, Not } from 'typeorm';
import { ClassService } from '../class/class.service';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { InscriptionCourse } from '../InscriptionCourse/inscription-course.entity';
import { InscriptionCourseService } from '../InscriptionCourse/inscription-course.service';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { DocumentStudent } from './documents/document-students.entity';
import { DocumentStudentRepository } from './documents/document-students.repository';
import { CreateLegalGuardianInput } from './dtos/create-legal-guardian.dto.input';
import { CreateStudentCourseInput } from './dtos/create-student-course.dto.input';
import { CreateStudentCourseOutput } from './dtos/create-student-course.dto.output';
import { GetAllStudentDtoInput } from './dtos/get-all-student.dto.input';
import {
  GetAllStudentDtoOutput,
  toGetAllStudentDtoOutput,
} from './dtos/get-all-student.dto.output';
import {
  GetEnrolledDtoOutput,
  StudentsDtoOutput,
} from './dtos/get-enrolled.dto.output';
import { ScheduleEnrolledDtoInput } from './dtos/schedule-enrolled.dto.input';
import { StatusApplication } from './enums/stastusApplication';
import { LegalGuardian } from './legal-guardian/legal-guardian.entity';
import { LegalGuardianRepository } from './legal-guardian/legal-guardian.repository';
import { LogStudent } from './log-student/log-student.entity';
import { LogStudentRepository } from './log-student/log-student.repository';
import { StudentCourse } from './student-course.entity';
import { StudentCourseRepository } from './student-course.repository';
import { SocioeconomicAnswer } from './types/student-course-full';

@Injectable()
export class StudentCourseService extends BaseService<StudentCourse> {
  constructor(
    private readonly repository: StudentCourseRepository,
    private readonly documentRepository: DocumentStudentRepository,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly inscriptionCourseService: InscriptionCourseService,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    private readonly legalGuardianRepository: LegalGuardianRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly logStudentRepository: LogStudentRepository,
    private configService: ConfigService,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly classService: ClassService,
    private readonly discordWebhook: DiscordWebhook,
  ) {
    super(repository);
  }

  async create(
    dto: CreateStudentCourseInput,
  ): Promise<CreateStudentCourseOutput> {
    const inscriptionCourse = await this.inscriptionCourseService.findOneBy({
      id: dto.inscriptionId,
    });

    if (!inscriptionCourse) {
      throw new HttpException(
        'No active inscription course for this partner prep course',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (inscriptionCourse.actived !== Status.Approved) {
      throw new HttpException(
        'Processo Seletivo não está ativo',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.ensureStudentNotAlreadySubscribe(inscriptionCourse, dto.userId);

    if (
      this.isMinor(dto.birthday) &&
      (!dto.legalGuardian ||
        !dto.legalGuardian.fullName ||
        !dto.legalGuardian.cpf ||
        !dto.legalGuardian.phone ||
        !dto.legalGuardian.family_relationship)
    ) {
      throw new HttpException(
        'The full Legal guardian information is required for minors',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.updateUserInformation(dto);

    const studentCourse = await this.createStudentCourse(
      dto,
      inscriptionCourse.partnerPrepCourse,
      inscriptionCourse,
    );

    if (this.isMinor(user.birthday)) {
      await this.createLegalGuardian(dto.legalGuardian, studentCourse);
    }

    await this.userRepository.update(user);
    const representatives =
      await this.collaboratorRepository.findCollaboratorsByPermission(
        Permissions.gerenciarProcessoSeletivo,
        inscriptionCourse.partnerPrepCourse.id,
      );

    const log = new LogStudent();
    log.studentId = studentCourse.id;
    log.applicationStatus = StatusApplication.UnderReview;
    log.description = 'Inscrição realizada';
    await this.logStudentRepository.create(log);

    await this.sendEmailConfirmation(
      dto,
      representatives.map((rep) => rep.user.email),
      inscriptionCourse.partnerPrepCourse.geo.name,
    );
    return { id: studentCourse.id } as CreateStudentCourseOutput;
  }

  async createUser(userDto: CreateUserDtoInput, inscriptionId: string) {
    const user = await this.userService.createUser(userDto);
    const token = await this.jwtService.signAsync(
      {
        user: { id: user.id, flow: CreateFlow.CREATE_STUDENT, inscriptionId },
      },
      { expiresIn: '2h' },
    );
    await this.emailService.sendCreateUser(user, token);
  }

  async findAll({
    page,
    limit,
    partnerPrepCourse,
  }: GetAllStudentDtoInput): Promise<GetAllOutput<GetAllStudentDtoOutput>> {
    const result = await this.repository.findAllBy({
      where: { partnerPrepCourse },
      limit: limit,
      page: page,
    });

    return {
      data: result.data.map((studentCourse) =>
        toGetAllStudentDtoOutput(studentCourse),
      ),
      page: result.page,
      totalItems: result.totalItems,
      limit: result.limit,
    } as GetAllOutput<GetAllStudentDtoOutput>;
  }

  async uploadProfilePhoto(file: Express.Multer.File) {
    const fileKey = await this.blobService.uploadFile(
      file,
      this.configService.get<string>('BUCKET_PROFILE'),
    );
    return fileKey;
  }

  async updateProfilePhotoByStudent(
    file: Express.Multer.File,
    studentId: string,
  ) {
    const student = await this.repository.findOneBy({ id: studentId });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    try {
      await this.blobService.deleteFile(
        student.photo,
        this.configService.get<string>('BUCKET_PROFILE'),
      );
    } catch (error) {
      const log = new LogStudent();
      log.studentId = student.id;
      log.applicationStatus = student.applicationStatus;
      log.description = `Erro ao deletar foto de perfil antiga - ${error}`;
      await this.logStudentRepository.create(log);
    }
    const fileKey = await this.blobService.uploadFile(
      file,
      this.configService.get<string>('BUCKET_PROFILE'),
    );
    student.photo = fileKey;

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = student.applicationStatus;
    log.description = 'Atualizou foto de perfil';
    await this.logStudentRepository.create(log);

    await this.repository.update(student);
  }

  async declaredInterest(
    files: Array<Express.Multer.File>,
    photo: Express.Multer.File,
    areaInterest: string[],
    selectedCourses: string[],
    userId: string,
  ) {
    const student = await this.repository.findOneBy({ id: userId });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.DeclaredInterest) {
      throw new HttpException(
        'Você já declarou interesse neste Processo Seletivo.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (student.applicationStatus !== StatusApplication.CalledForEnrollment) {
      throw new HttpException(
        'Apenas estudantes convocados para matricular podem declarar interesse',
        HttpStatus.BAD_REQUEST,
      );
    }
    const exprires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90);
    await Promise.all(
      files.map(async (file) => {
        const fileKey = await this.blobService.uploadFile(
          file,
          this.configService.get<string>('BUCKET_DOC'),
          exprires,
        );
        const document: DocumentStudent = new DocumentStudent();
        document.key = fileKey;
        document.exprires = exprires;
        document.name = file.originalname;
        document.studentCourse = student.id;

        await this.documentRepository.create(document);
      }),
    );
    const fileKey = await this.uploadProfilePhoto(photo);

    student.applicationStatus = StatusApplication.DeclaredInterest;
    student.areaInterest = JSON.stringify(areaInterest);
    student.selectedCourses = JSON.stringify(selectedCourses);
    student.photo = fileKey;

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = StatusApplication.DeclaredInterest;
    log.description = 'Declarou interesse';
    await this.logStudentRepository.create(log);

    await this.repository.update(student);
  }

  async getDocument(fileKey: string) {
    const file = await this.blobService.getFile(
      fileKey,
      this.configService.get<string>('BUCKET_DOC'),
    );
    return file;
  }

  async getProfilePhoto(fileKey: string) {
    const file = await this.blobService.getFile(
      fileKey,
      this.configService.get<string>('BUCKET_PROFILE'),
    );
    return file;
  }

  async getUserInfoToInscription(inscriptionId: string, userId: string) {
    const inscription =
      await this.inscriptionCourseService.getById(inscriptionId);

    if (!inscription) {
      throw new NotFoundException('Processo Seletivo não encontrado');
    }

    const isAlreadyEnrolled = inscription.students.some(
      (student) => student.userId === userId,
    );

    if (isAlreadyEnrolled) {
      throw new ConflictException(
        'Você já realizou a inscrição neste Processo Seletivo.',
      );
    }

    return this.userService.me(userId);
  }

  async updateIsFreeInfo(id: string, isFree: boolean) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.UnderReview) {
      student.isFree = isFree;
      student.applicationStatus = StatusApplication.UnderReview;
      await this.repository.update(student);

      const log = new LogStudent();
      log.studentId = student.id;
      log.applicationStatus = StatusApplication.UnderReview;
      log.description = isFree
        ? 'Alterou status para isento'
        : 'Alterou status para pagante';
      await this.logStudentRepository.create(log);
    } else {
      throw new HttpException(
        'Não é possível alterar informações do estudantes. Status Block',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateSelectEnrolled(id: string, enrolled: boolean) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    const inscription = await this.inscriptionCourseService.findOneBy({
      id: student.inscriptionCourse.id,
    });
    if (!inscription) {
      throw new HttpException('Inscrição não encontrada', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.Enrolled) {
      throw new HttpException(
        'Não é possível alterar status de convocação de estudantes matriculados',
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
      if (!enrolled) {
        student.selectEnrolled = false;
        log.description =
          'Alterou status de convocação para não convocar estudante';
      } else {
        student.selectEnrolled = true;
        log.description =
          'Alterou status de convocação para convocar estudante';
      }
      student.applicationStatus = StatusApplication.UnderReview;
      log.applicationStatus = StatusApplication.UnderReview;
      student.selectEnrolledAt = null;
      student.limitEnrolledAt = null;
      if (student.waitingList) {
        student.waitingList = false;
        await this.inscriptionCourseService.removeStudentWaitingList(
          student,
          inscription,
        ); // remove student from waiting list already update the student and the inscription
      } else {
        await this.repository.update(student);
      }
      await this.logStudentRepository.create(log);
    } else {
      throw new HttpException(
        'Não é possível alterar informações do estudantes. Status Block',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /*************  ✨ Codeium Command ⭐  *************/
  /**
 * Schedules enrolled students for a given inscription course within the specified date range.
 * 
 * @param inscriptionId - The ID of the inscription course for which students are to be scheduled.
 * @param data_start - The start date of the scheduling period.
 * @param data_end - The end date of the scheduling period.
 * 
 * This method retrieves all students who have been selected as enrolled for the specified
/******  2841cc7f-0642-4e69-8de6-526055053514  *******/
  async scheduleEnrolled({
    inscriptionId,
    data_start,
    data_end,
  }: ScheduleEnrolledDtoInput) {
    const inscription = await this.inscriptionCourseService.findOneBy({
      id: inscriptionId,
    });
    const students = await this.repository.findAllBy({
      page: 1,
      limit: 9999,
      where: { selectEnrolled: true, inscriptionCourse: inscription },
    });
    if (students.data.length === 0) {
      throw new HttpException(
        'Nenhum estudante selecionado',
        HttpStatus.BAD_REQUEST,
      );
    }
    const data_convocacao = new Date(data_start);
    data_convocacao.setHours(0, 0, 0, 0);

    const data_limite_convocacao = new Date(data_end);
    data_limite_convocacao.setDate(data_limite_convocacao.getDate() + 1);
    data_limite_convocacao.setHours(0, 0, 0, 0);
    await this.repository.scheduleEnrolled(
      students.data.map((student) => student.id),
      data_convocacao,
      data_limite_convocacao,
    );
    await Promise.all(
      students.data.map(async (student) => {
        const log = new LogStudent();
        log.studentId = student.id;
        log.description = `Convocado para matricular em ${data_convocacao.toLocaleDateString(
          'pt-BR',
        )} com limite de concovação para ${data_limite_convocacao.toLocaleDateString(
          'pt-BR',
        )}`;
        log.applicationStatus = StatusApplication.CalledForEnrollment;
        await this.logStudentRepository.create(log);
      }),
    );
  }

  async confirmEnrolled(id: string) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus !== StatusApplication.DeclaredInterest) {
      throw new HttpException(
        'Não é possível confirmar estudantes matriculados que não declarou interesse',
        HttpStatus.NOT_FOUND,
      );
    } else {
      student.applicationStatus = StatusApplication.Enrolled;
      student.cod_enrolled = await this.generateEnrolledCode();
      await this.repository.update(student);

      const log = new LogStudent();
      log.studentId = student.id;
      log.applicationStatus = StatusApplication.Enrolled;
      log.description = `Numero de Matrícula: ${student.cod_enrolled}`;
      await this.logStudentRepository.create(log);
    }
  }

  async resetStudent(id: string) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.Enrolled) {
      throw new HttpException(
        'Estudante matriculado, impossivel resetar',
        HttpStatus.BAD_REQUEST,
      );
    }
    student.applicationStatus = StatusApplication.UnderReview;
    student.selectEnrolled = false;
    student.isFree = true;
    student.selectEnrolledAt = null;
    student.limitEnrolledAt = null;
    if (student.waitingList) {
      const inscription = await this.inscriptionCourseService.findOneBy({
        id: student.inscriptionCourse.id,
      });
      student.waitingList = false;
      await this.inscriptionCourseService.removeStudentWaitingList(
        student,
        inscription,
      ); // remove student from waiting list already update the student and the inscription
    } else {
      await this.repository.update(student);
    }

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = StatusApplication.UnderReview;
    log.description = 'Estudante resetado';
    await this.logStudentRepository.create(log);
  }

  async rejectStudent(id: string, reason: string) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.Enrolled) {
      throw new HttpException(
        'Estudante matriculado, impossivel resetar',
        HttpStatus.BAD_REQUEST,
      );
    }
    student.applicationStatus = StatusApplication.Rejected;
    await this.repository.update(student);

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = StatusApplication.Rejected;
    log.description = reason || 'Estudante indeferido';
    await this.logStudentRepository.create(log);
  }

  async verifyDeclaredInterest(studentId: string) {
    const student = await this.repository.findOneBy({ id: studentId });
    if (!student) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
    }
    if (
      student.applicationStatus === StatusApplication.DeclaredInterest ||
      student.applicationStatus === StatusApplication.Enrolled
    ) {
      return true;
    }
    return false;
  }

  async sendEmailDeclaredInterestById(id: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentTimeInSeconds = Math.floor(today.getTime() / 1000);
    const students = await this.repository.findOneToSendEmail(id);
    if (!students) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
    }
    const lastLog = students.logs
      .filter((log) => log.description === 'Email de convocação enviado')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
    const logDate: Date | undefined = lastLog?.createdAt
      ? new Date(lastLog?.createdAt)
      : undefined;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const sended_email_recently: boolean =
      logDate != undefined && logDate.getTime() > oneHourAgo.getTime();
    if (sended_email_recently) {
      throw new HttpException(
        'Email enviado recentemente',
        HttpStatus.BAD_REQUEST,
      );
    }
    const payload = {
      user: { id: students.id, isFree: students.isFree },
    };
    const limitTimeInSeconds = Math.floor(
      students.limitEnrolledAt.getTime() / 1000,
    );
    const expiresIn = limitTimeInSeconds - currentTimeInSeconds;
    const token = await this.jwtService.signAsync(payload, { expiresIn });

    const student_name = `${students.user.firstName} ${students.user.lastName}`;
    students.limitEnrolledAt.setDate(students.limitEnrolledAt.getDate() - 1);

    await this.emailService.sendDeclaredInterest(
      student_name,
      students.user.email,
      students.partnerPrepCourse.geo.name,
      students.limitEnrolledAt,
      token,
    );

    const log = new LogStudent();
    log.studentId = students.id;
    log.applicationStatus = StatusApplication.CalledForEnrollment;
    log.description = 'Email de convocação enviado';
    await this.logStudentRepository.create(log);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/Sao_Paulo',
  })
  async sendEmailDeclaredInterest() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentTimeInSeconds = Math.floor(today.getTime() / 1000);

      const students = await this.repository.findAllCompletedBy({
        selectEnrolledAt: today,
        applicationStatus: StatusApplication.CalledForEnrollment,
      });

      const chunkSize = 5;
      for (let i = 0; i < students.length; i += chunkSize) {
        const chunk = students.slice(i, i + chunkSize);

        const results = await Promise.allSettled(
          chunk.map(async (stu) => {
            try {
              const payload = { user: { id: stu.id, isFree: stu.isFree } };
              const limitTimeInSeconds = Math.floor(
                stu.limitEnrolledAt.getTime() / 1000,
              );
              const expiresIn = limitTimeInSeconds - currentTimeInSeconds;
              const token = await this.jwtService.signAsync(payload, {
                expiresIn,
              });

              const student_name = `${stu.user.firstName} ${stu.user.lastName}`;
              stu.limitEnrolledAt.setDate(stu.limitEnrolledAt.getDate() - 1);

              await this.emailService.sendDeclaredInterest(
                student_name,
                stu.user.email,
                stu.partnerPrepCourse.geo.name,
                stu.limitEnrolledAt,
                token,
              );

              const log = new LogStudent();
              log.studentId = stu.id;
              log.applicationStatus = StatusApplication.CalledForEnrollment;
              log.description = 'Email de convocação enviado';
              await this.logStudentRepository.create(log);
            } catch (emailError) {
              throw {
                email: stu.user.email,
                id: stu.id,
                error: emailError.message,
              };
            }
          }),
        );

        const failedStudents = results
          .filter((result) => result.status === 'rejected')
          .map((result) => (result as PromiseRejectedResult).reason);

        if (failedStudents.length > 0) {
          this.discordWebhook.sendMessage(
            `Falha no envio de emails para: ${failedStudents
              .map((s) => `${s.email} (ID: ${s.id})`)
              .join(', ')}`,
          );
        }

        // Delay entre os chunks para evitar sobrecarga no SMTP
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 5 segundos de pausa
      }
    } catch (error) {
      this.discordWebhook.sendMessage(
        `Erro grave ao enviar emails de convocação: ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/Sao_Paulo',
  })
  async verifyLostEnrolled() {
    try {
      const students = await this.repository.getNotConfirmedEnrolled();

      if (students.length === 0) return; // Evita processamento desnecessário

      await this.repository.notConfirmedEnrolled();

      const chunkSize = 10;
      for (let i = 0; i < students.length; i += chunkSize) {
        const chunk = students.slice(i, i + chunkSize);

        const results = await Promise.allSettled(
          chunk.map(async (student) => {
            try {
              const log = new LogStudent();
              log.studentId = student.id;
              log.applicationStatus = StatusApplication.MissedDeadline;
              log.description = 'Matrícula perdida';
              await this.logStudentRepository.create(log);
            } catch (error) {
              throw { studentId: student.id, error: error.message };
            }
          }),
        );

        const failedLogs = results
          .filter((result) => result.status === 'rejected')
          .map((result) => (result as PromiseRejectedResult).reason);

        if (failedLogs.length > 0) {
          this.discordWebhook.sendMessage(
            `Erro ao registrar matrícula perdida para: ${failedLogs
              .map((s) => `ID: ${s.studentId}`)
              .join(', ')}`,
          );
        }
      }
    } catch (error) {
      this.discordWebhook.sendMessage(
        `Erro grave ao processar matrículas perdidas: ${error.message}`,
      );
    }
  }

  async updateClass(studentId: string, classId: string) {
    const student = await this.repository.findOneBy({ id: studentId });
    if (!student) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
    }
    const class_ = await this.classService.findOneBy({ id: classId });
    if (!class_) {
      throw new HttpException('Turma nao encontrada', HttpStatus.NOT_FOUND);
    }
    student.class = class_;
    await this.repository.update(student);

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = StatusApplication.Enrolled;
    log.description = `Atribuido a Turma: ${class_.name} (${class_.year})`;
    await this.logStudentRepository.create(log);
  }

  async getEnrolled({
    page,
    limit,
    userId,
    filter,
    sort,
  }: GetAllInput & {
    userId: string;
    filter?: Filter;
    sort: Sort;
  }): Promise<GetEnrolledDtoOutput> {
    const partnerPrepCourse =
      await this.partnerPrepCourseService.getByUserId(userId);

    if (!partnerPrepCourse) {
      throw new HttpException(
        'Cursinho Parceiro nao encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const where = {
      partnerPrepCourse,
      cod_enrolled: Not(IsNull()),
    };

    const result = await this.repository.findAllBy({
      where,
      limit,
      page,
      orderBy: sort,
      filters: filter ? [filter] : [],
    });

    return {
      name: partnerPrepCourse.geo.name,
      students: {
        data: result.data.map(
          (student) =>
            ({
              id: student.id,
              name: student.user.useSocialName
                ? `${student.user.socialName?.split(' ')[0]} ${
                    student.user.lastName
                  }`
                : `${student.user.firstName} ${student.user.lastName}`,

              email: student.user.email,
              whatsapp: student.whatsapp,
              urgencyPhone: student.urgencyPhone,
              applicationStatus: student.applicationStatus,
              cod_enrolled: student.cod_enrolled,
              birthday: student.user.birthday,
              photo: student.photo,
              class: {
                id: student.class?.id,
                name: student.class?.name,
                year: student.class?.year,
                endDate: student.class?.endDate,
              },
            }) as unknown as StudentsDtoOutput,
        ),
        totalItems: result.totalItems,
        page: page,
        limit: limit,
      },
    };
  }

  async cancelEnrolled(studentId: string, reason: string) {
    const student = await this.repository.findOneBy({ id: studentId });
    if (!student) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus !== StatusApplication.Enrolled) {
      throw new HttpException(
        'Estudante nao esta matriculado',
        HttpStatus.BAD_REQUEST,
      );
    }
    student.applicationStatus = StatusApplication.EnrollmentCancelled;
    await this.repository.update(student);

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = StatusApplication.EnrollmentCancelled;
    log.description = reason || 'Matrícula cancelada';
    await this.logStudentRepository.create(log);
  }

  async activeEnrolled(studentId: string) {
    const student = await this.repository.findOneBy({ id: studentId });
    if (!student) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus !== StatusApplication.EnrollmentCancelled) {
      throw new HttpException(
        'Estudante nao esta matriculado',
        HttpStatus.BAD_REQUEST,
      );
    }
    student.applicationStatus = StatusApplication.Enrolled;
    await this.repository.update(student);

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = StatusApplication.Enrolled;
    log.description = 'Matrícula reativada';
    await this.logStudentRepository.create(log);
  }

  private async generateEnrolledCode() {
    const year = new Date().getFullYear();
    const lastCode = await this.repository.getLastEnrollmentCode();
    if (!lastCode) {
      return `${year}0001`;
    }

    const lastYear = parseInt(lastCode.slice(0, 4)); // Extrai os 4 primeiros caracteres como ano

    if (lastYear !== year) {
      return `${year}0001`; // Se mudou o ano, reinicia do 0001
    }

    const code = parseInt(lastCode.slice(4)) + 1;
    return `${year}${code.toString().padStart(4, '0')}`;
  }

  private ensureStudentNotAlreadySubscribe(
    inscriptionCourse: InscriptionCourse,
    userId: string,
  ) {
    if (
      inscriptionCourse.students?.some((student) => student.userId === userId)
    ) {
      throw new HttpException(
        'Student already subscribe in this inscription course',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async updateUserInformation(dto: CreateStudentCourseInput) {
    const user = await this.userService.findOneBy({ id: dto.userId });

    // Update only fields that are present in the DTO
    Object.assign(user, {
      firstName: dto.firstName || user.firstName,
      lastName: dto.lastName || user.lastName,
      socialName: dto.socialName || user.socialName,
      birthday: dto.birthday || user.birthday,
      street: dto.street || user.street,
      number: dto.number || user.number,
      postalCode: dto.postalCode || user.postalCode,
      complement: dto.complement || user.complement,
      city: dto.city || user.city,
      state: dto.state || user.state,
      neighborhood: dto.neighborhood || user.neighborhood,
    });

    return user;
  }

  private async createStudentCourse(
    dto: CreateStudentCourseInput,
    partnerPrepCourse: PartnerPrepCourse,
    inscriptionCourse: InscriptionCourse,
  ): Promise<StudentCourse> {
    const studentCourse: StudentCourse = Object.assign(new StudentCourse(), {
      userId: dto.userId,
      rg: dto.rg,
      uf: dto.uf || '',
      cpf: dto.cpf,
      email: dto.email,
      whatsapp: dto.whatsapp,
      urgencyPhone: dto.urgencyPhone,
      partnerPrepCourse: partnerPrepCourse,
      socioeconomic: dto.socioeconomic,
    });

    studentCourse.inscriptionCourse = inscriptionCourse;

    return this.repository.create(studentCourse);
  }

  private async createLegalGuardian(
    guardianDto: CreateLegalGuardianInput,
    studentCourse: StudentCourse,
  ) {
    const legalGuardian = Object.assign(new LegalGuardian(), {
      fullName: guardianDto.fullName,
      rg: guardianDto.rg,
      uf: guardianDto.uf,
      cpf: guardianDto.cpf,
      phone: guardianDto.phone,
      studentCourse: studentCourse,
      family_relationship: guardianDto.family_relationship,
    });

    await this.legalGuardianRepository.create(legalGuardian);
  }

  private isMinor(birthday: Date): boolean {
    const age = this.calculateAge(birthday);
    return age < 18;
  }

  private calculateAge(birthday: Date): number {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  private getUniqueQuestions = (socioeconomic: SocioeconomicAnswer[]) => {
    const questions = new Set();

    socioeconomic.forEach((socioItem) => {
      questions.add(socioItem.question);
    });

    return Array.from(questions) as string[]; // Converte o Set para array
  };

  private flattenData = (student: CreateStudentCourseInput) => {
    const flattenedItem: any = { ...student };

    const birthday = dayjs(flattenedItem.birthday).format('DD/MM/YYYY');

    // Remover o campo "socioeconomic" original se não quiser mantê-lo
    delete flattenedItem.socioeconomic;
    delete flattenedItem.partnerPrepCourse;
    delete flattenedItem.userId;
    flattenedItem['Nome'] = flattenedItem.firstName;
    delete flattenedItem.firstName;
    flattenedItem['Sobrenome'] = flattenedItem.lastName;
    delete flattenedItem.lastName;
    flattenedItem['Nome Social'] = flattenedItem.socialName;
    delete flattenedItem.socialName;
    flattenedItem['Data de Nascimento'] = birthday;
    delete flattenedItem.birthday;
    flattenedItem['RG'] = flattenedItem.rg;
    delete flattenedItem.rg;
    flattenedItem['UF'] = flattenedItem.uf;
    delete flattenedItem.uf;
    flattenedItem['CPF'] = flattenedItem.cpf;
    delete flattenedItem.cpf;
    flattenedItem['E-mail'] = flattenedItem.email;
    delete flattenedItem.email;
    flattenedItem['WhatsApp'] = flattenedItem.whatsapp;
    delete flattenedItem.whatsapp;
    flattenedItem['Telefone de Emergência'] = flattenedItem.urgencyPhone;
    delete flattenedItem.urgencyPhone;
    flattenedItem['Rua'] = flattenedItem.street;
    delete flattenedItem.street;
    flattenedItem['Número'] = flattenedItem.number;
    delete flattenedItem.number;
    flattenedItem['Complemento'] = flattenedItem.complement;
    delete flattenedItem.complement;
    flattenedItem['CEP'] = flattenedItem.postalCode;
    delete flattenedItem.postalCode;
    flattenedItem['Cidade'] = flattenedItem.city;
    delete flattenedItem.city;
    flattenedItem['Estado'] = flattenedItem.state;
    delete flattenedItem.state;
    flattenedItem['Bairro'] = flattenedItem.neighborhood;
    delete flattenedItem.neighborhood;
    flattenedItem['Nome do Responsável'] =
      flattenedItem.legalGuardian?.fullName;
    flattenedItem['RG do Responsável'] = flattenedItem.legalGuardian?.rg;
    flattenedItem['UF do Responsável'] = flattenedItem.legalGuardian?.uf;
    flattenedItem['CPF do Responsável'] = flattenedItem.legalGuardian?.cpf;
    flattenedItem['Telefone do Responsável'] =
      flattenedItem.legalGuardian?.phone;
    flattenedItem['Parentesco'] =
      flattenedItem.legalGuardian?.family_relationship;
    delete flattenedItem.legalGuardian;

    const socioeconomic: SocioeconomicAnswer[] = JSON.parse(
      student.socioeconomic,
    );
    const questions = this.getUniqueQuestions(socioeconomic);

    // Preenche as respostas socioeconômicas
    questions.forEach((question) => {
      // Encontra a resposta para a pergunta atual
      const socioItem = socioeconomic.find(
        (item) => item.question === question,
      );

      // Se a pergunta tiver uma resposta, coloca-a na coluna, senão deixa vazio
      if (!socioItem) flattenedItem[question] = '';
      else {
        const answer =
          typeof socioItem.answer === 'object'
            ? socioItem.answer.join(', ')
            : socioItem.answer;
        flattenedItem[question] = flattenedItem[question]
          ? `${flattenedItem[question]}, ${answer}`
          : answer;
      }
    });

    return flattenedItem as object;
  };

  private async sendEmailConfirmation(
    student: CreateStudentCourseInput,
    emailRepresentant: string[],
    nome_cursinho: string,
  ) {
    const emailList = [
      student.email,
      ...emailRepresentant,
      'cleyton.biffe@vcnafacul.com.br',
    ];
    const studentFull = this.flattenData(student);
    await this.emailService.sendConfirmationStudentRegister(
      emailList,
      studentFull,
      nome_cursinho,
    );
  }
}
