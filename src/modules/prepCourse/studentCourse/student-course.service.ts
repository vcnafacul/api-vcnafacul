import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import { Permissions } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { CreateUserDtoInput } from 'src/modules/user/dto/create.dto.input';
import { CreateFlow } from 'src/modules/user/enum/create-flow';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { CreateSubmissionDtoInput } from 'src/modules/vcnafacul-form/submission/dto/create-submission.dto.input';
import { SubmissionService } from 'src/modules/vcnafacul-form/submission/submission.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import {
  Filter,
  GetAllInput,
  Sort,
} from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EMAIL_CONFIG } from 'src/shared/config/email.config';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { maskCpf } from 'src/utils/maskCpf';
import { maskEmail } from 'src/utils/maskEmail';
import { maskPhone } from 'src/utils/maskPhone';
import { IsNull, Not } from 'typeorm';
import { ClassRepository } from '../class/class.repository';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { InscriptionCourse } from '../InscriptionCourse/inscription-course.entity';
import { InscriptionCourseService } from '../InscriptionCourse/inscription-course.service';
import { LogPartner } from '../partnerPrepCourse/log-partner/log-partner.entity';
import { LogPartnerRepository } from '../partnerPrepCourse/log-partner/log-partner.repository';
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
import { RegistrationMonitoringDtoOutput } from './dtos/registrion-monitoring.dto.output';
import { ScheduleEnrolledDtoInput } from './dtos/schedule-enrolled.dto.input';
import { VerifyDeclaredInterestDtoOutput } from './dtos/verify-declared-interest.dto.out';
import {
  EnrollmentPeriodStatus,
  VerifyEnrollmentStatusDtoOutput,
} from './dtos/verify-enrollment-status.dto.output';
import { StatusApplication } from './enums/stastusApplication';
import { LegalGuardian } from './legal-guardian/legal-guardian.entity';
import { LegalGuardianRepository } from './legal-guardian/legal-guardian.repository';
import { LogStudent } from './log-student/log-student.entity';
import { LogStudentRepository } from './log-student/log-student.repository';
import { StudentCourse } from './student-course.entity';
import { StudentCourseRepository } from './student-course.repository';
import { EnrollmentCertificate } from './types/enrollment-certificate';
import { SocioeconomicAnswer } from './types/student-course-full';
import { createEnrollmentCertificate } from './utils/create-enrollment-certificate';

@Injectable()
export class StudentCourseService extends BaseService<StudentCourse> {
  private readonly logger = new Logger(StudentCourseService.name);
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
    private readonly logPartnerRepository: LogPartnerRepository,
    private envService: EnvService,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly classRepository: ClassRepository,
    private readonly discordWebhook: DiscordWebhook,
    private readonly roleService: RoleService,
    private readonly cache: CacheService,
    private readonly submissionService: SubmissionService,
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

    const submissionDto: CreateSubmissionDtoInput = {
      inscriptionId: inscriptionCourse.id,
      userId: user.id,
      studentId: studentCourse.id,
      name: user.useSocialName
        ? user.socialName + ' ' + user.lastName
        : user.firstName + ' ' + user.lastName,
      email: user.email,
      birthday: dto.birthday,
      answers: dto.socioeconomic,
    };

    await this.submissionService.createSubmission(submissionDto);

    if (this.isMinor(user.birthday)) {
      await this.createLegalGuardian(dto.legalGuardian, studentCourse);
    }

    if (dto.socialName) user.useSocialName = true;
    else user.useSocialName = false;

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
        this.envService.get('BUCKET_PROFILE'),
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
      this.envService.get('BUCKET_PROFILE'),
    );
    await this.cache.set(
      `profile:photo:${fileKey}`,
      file,
      60 * 60 * 24 * 1000 * 7,
    );
    student.photo = fileKey;

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = student.applicationStatus;
    log.description = 'Atualizou foto de perfil';
    await this.logStudentRepository.create(log);

    await this.repository.update(student);
    return fileKey;
  }

  async declaredInterest(
    files: Array<Express.Multer.File>,
    photo: Express.Multer.File,
    areaInterest: string[],
    selectedCourses: string[],
    studentId: string,
  ) {
    const student = await this.repository.findOneBy({ id: studentId });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.DeclaredInterest) {
      throw new HttpException(
        'Você já declarou interesse neste Processo Seletivo',
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
          this.envService.get('BUCKET_STUDENT_DOC'),
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
    const fileKey = await this.blobService.uploadFile(
      photo,
      this.envService.get('BUCKET_PROFILE'),
    );

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
    //cache
    const cachedFile = await this.cache.wrap<{
      buffer: string;
      contentType: string;
    }>(
      `document:${fileKey}`,
      async () => {
        return await this.blobService.getFile(
          fileKey,
          this.envService.get('BUCKET_STUDENT_DOC'),
        );
      },
      60 * 60 * 24 * 1000 * 7,
    );
    return cachedFile;
  }

  async getProfilePhoto(fileKey: string) {
    //cache
    const cachedFile = await this.cache.wrap<{
      buffer: string;
      contentType: string;
    }>(
      `profile:photo:${fileKey}`,
      async () => {
        return await this.blobService.getFile(
          fileKey,
          this.envService.get('BUCKET_PROFILE'),
        );
      },
      60 * 60 * 24 * 1000 * 7,
    );
    return cachedFile;
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

    if (student.applicationStatus !== StatusApplication.UnderReview) {
      throw new HttpException(
        'Não é possível alterar informações do estudantes. Status Block',
        HttpStatus.BAD_REQUEST,
      );
    }

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
  }

  async updateSelectEnrolled(id: string, enrolled: boolean) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    const inscription = await this.inscriptionCourseService.findOneBy({
      id: student.inscriptionCourse.id,
    });
    if (student.applicationStatus === StatusApplication.Enrolled) {
      throw new HttpException(
        'Não é possível alterar status de convocação de estudantes matriculados',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      student.applicationStatus !== StatusApplication.UnderReview &&
      (student.applicationStatus !== StatusApplication.CalledForEnrollment ||
        new Date() >= new Date(student.selectEnrolledAt))
    ) {
      throw new HttpException(
        'Não é possível alterar informações do estudantes. Status Block',
        HttpStatus.BAD_REQUEST,
      );
    }
    const log = new LogStudent();
    log.studentId = student.id;
    if (!enrolled) {
      student.selectEnrolled = false;
      log.description =
        'Alterou status de convocação para não convocar estudante';
    } else {
      student.selectEnrolled = true;
      log.description = 'Alterou status de convocação para convocar estudante';
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
    if (!inscription) {
      throw new HttpException(
        'Processo Seletivo nao encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
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

  async confirmEnrolled(id: string, classId: string) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    const class_ = await this.classRepository.findOneById(classId);
    if (!class_) {
      throw new HttpException('Turma não encontrada', HttpStatus.NOT_FOUND);
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
      await this.updateClass(id, classId);

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
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.Enrolled) {
      throw new HttpException(
        'Não é possivel resetar estudante matriculado',
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
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.Enrolled) {
      throw new HttpException(
        'Não é possivel rejeitar estudante matriculado',
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

  async verifyDeclaredInterest(
    inscriptinId: string,
    userId: string,
  ): Promise<VerifyDeclaredInterestDtoOutput> {
    const inscriptin = await this.inscriptionCourseService.findOneBy({
      id: inscriptinId,
    });
    if (!inscriptin) {
      throw new HttpException(
        'Processo Seletivo não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const student = await this.repository.getStudentByUserIdAndInscriptionId(
      userId,
      inscriptin.id,
    );
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    let declared = false;
    if (
      student.applicationStatus === StatusApplication.DeclaredInterest ||
      student.applicationStatus === StatusApplication.Enrolled
    ) {
      declared = true;
    }
    const today = new Date();
    return {
      requestDocuments: inscriptin.requestDocuments,
      convocated:
        student.applicationStatus === StatusApplication.CalledForEnrollment,
      declared,
      expired: student.limitEnrolledAt < today,
      studentId: student.id,
      isFree: student.isFree,
    };
  }

  async sendEmailDeclaredInterestById(id: string) {
    const students = await this.repository.findOneToSendEmail(id);
    if (!students) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (students.applicationStatus !== StatusApplication.CalledForEnrollment) {
      throw new HttpException(
        'Estudante nao foi convocado',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      students.selectEnrolledAt === null ||
      (students.limitEnrolledAt === null &&
        students.selectEnrolledAt > new Date()) ||
      students.limitEnrolledAt < new Date()
    ) {
      throw new HttpException(
        'O período de convocação não confere com o período permitido para envio do email',
        HttpStatus.BAD_REQUEST,
      );
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

    const student_name = `${students.user.firstName} ${students.user.lastName}`;

    await this.emailService.sendDeclaredInterest(
      student_name,
      students.user.email,
      students.partnerPrepCourse.geo.name,
      students.limitEnrolledAt,
      students.inscriptionCourse.id,
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

      const students = await this.repository.findAllCompletedBy({
        selectEnrolledAt: today,
        applicationStatus: StatusApplication.CalledForEnrollment,
      });

      const grouped = new Map<string, Map<string, StudentCourse[]>>();

      // Agrupar por inscriptionCourse.id e deadline (normalizado)
      for (const student of students) {
        const courseId = student.inscriptionCourse.id;

        const deadline = new Date(student.limitEnrolledAt);
        deadline.setHours(0, 0, 0, 0); // normalizar a hora
        const deadlineKey = deadline.toISOString(); // usar como chave

        if (!grouped.has(courseId)) {
          grouped.set(courseId, new Map());
        }

        const courseGroup = grouped.get(courseId)!;

        if (!courseGroup.has(deadlineKey)) {
          courseGroup.set(deadlineKey, []);
        }

        courseGroup.get(deadlineKey)!.push(student);
      }

      const chunkSize = EMAIL_CONFIG.MAX_BCC_PER_EMAIL;

      // Mapear quantos estudantes convocados por cursinho parceiro
      const partnerConvocationCount = new Map<
        string,
        { partnerId: string; count: number }
      >();

      for (const [courseId, deadlineGroup] of grouped.entries()) {
        for (const [deadlineKey, courseStudents] of deadlineGroup.entries()) {
          const deadline = new Date(deadlineKey);
          for (let i = 0; i < courseStudents.length; i += chunkSize) {
            const chunk = courseStudents.slice(i, i + chunkSize);

            const bccList = chunk.map((s) => s.user.email);
            const courseName = chunk[0].partnerPrepCourse.geo.name;
            const partnerId = chunk[0].partnerPrepCourse.id;

            try {
              await this.emailService.sendDeclaredInterestBulk(
                bccList,
                courseName,
                deadline,
                courseId,
              );

              await Promise.all(
                chunk.map((student) => {
                  const log = new LogStudent();
                  log.studentId = student.id;
                  log.applicationStatus = StatusApplication.CalledForEnrollment;
                  log.description = 'Email de convocação enviado (em lote)';
                  return this.logStudentRepository.create(log);
                }),
              );

              // Contabilizar convocações por cursinho
              if (partnerConvocationCount.has(partnerId)) {
                const current = partnerConvocationCount.get(partnerId)!;
                current.count += chunk.length;
              } else {
                partnerConvocationCount.set(partnerId, {
                  partnerId,
                  count: chunk.length,
                });
              }
              this.logger.log(
                `Email de convocação enviado para ${bccList.length} estudantes do curso ${courseName}`,
              );
            } catch (error) {
              this.discordWebhook.sendMessage(
                `Erro ao enviar email para inscrição ${courseId}, deadline ${deadlineKey}, chunk: ${bccList.join(
                  ', ',
                )}.\nErro: ${error.message}`,
              );
            }

            // Delay maior entre chunks para evitar rate limiting
            await new Promise((res) =>
              setTimeout(res, EMAIL_CONFIG.DELAY_BETWEEN_CHUNKS_MS),
            );
          }
        }
      }

      // Criar logs para cada cursinho parceiro com o total de convocações
      for (const { partnerId, count } of partnerConvocationCount.values()) {
        const logPartner = new LogPartner();
        logPartner.partnerId = partnerId;
        logPartner.description = `Convocação enviada para ${count} estudante${count > 1 ? 's' : ''}`;
        await this.logPartnerRepository.create(logPartner);
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

      const chunkSize = 50;
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
          await this.discordWebhook.sendMessage(
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
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    const class_ = await this.classRepository.findOneById(classId);
    if (!class_) {
      throw new HttpException('Turma não encontrada', HttpStatus.NOT_FOUND);
    }
    if (class_.coursePeriod.endDate < new Date()) {
      throw new HttpException('Turma já encerrada', HttpStatus.BAD_REQUEST);
    }
    student.class = class_;
    await this.repository.update(student);

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = StatusApplication.Enrolled;
    log.description = `Atribuido a Turma: ${class_.name} (${class_.coursePeriod?.year || 'N/A'})`;
    await this.logStudentRepository.create(log);
  }

  async getEnrolled({
    page,
    limit,
    userId,
    filter,
    sort,
    inscriptionCourseId,
  }: GetAllInput & {
    userId: string;
    filter?: Filter;
    sort: Sort;
    inscriptionCourseId?: string;
  }): Promise<GetEnrolledDtoOutput> {
    const partnerPrepCourse =
      await this.partnerPrepCourseService.getByUserId(userId);

    if (!partnerPrepCourse) {
      throw new HttpException(
        'Cursinho Parceiro não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const inscriptionCourse = await this.inscriptionCourseService.findOneBy({
      id: inscriptionCourseId,
    });
    if (!inscriptionCourse) {
      throw new HttpException(
        'Processo Seletivo não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const where = {
      partnerPrepCourse,
      cod_enrolled: Not(IsNull()),
      inscriptionCourse,
    };

    const result = await this.repository.findAllBy({
      where,
      limit,
      page,
      orderBy: sort,
      filters: filter ? [filter] : [],
    });

    const user = await this.userService.findUserById(userId);
    const role = await this.roleService.findOneById(user.role.id);
    const manager = role.gerenciarEstudantes;
    const admin = role.gerenciarProcessoSeletivo;

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

              email: manager
                ? student.user.email
                : maskEmail(student.user.email),
              whatsapp: manager
                ? student.whatsapp
                : maskPhone(student.whatsapp),
              urgencyPhone: student.urgencyPhone,
              cpf: admin ? student.cpf : maskCpf(student.cpf),
              applicationStatus: student.applicationStatus,
              cod_enrolled: student.cod_enrolled,
              birthday: student.user.birthday,
              photo: student.photo,
              class: {
                id: student.class?.id,
                name: student.class?.name,
                year: student.class?.coursePeriod?.year || 0,
                endDate: student.class?.coursePeriod?.endDate,
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
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus !== StatusApplication.Enrolled) {
      throw new HttpException(
        'Estudante não esta matriculado',
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
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus !== StatusApplication.EnrollmentCancelled) {
      throw new HttpException(
        'Estudante não esta matriculado',
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
      socioeconomic: JSON.stringify(dto.socioeconomic),
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

    const questions = this.getUniqueQuestions(student.socioeconomic);

    // Preenche as respostas socioeconômicas
    questions.forEach((question) => {
      // Encontra a resposta para a pergunta atual
      const socioItem = student.socioeconomic.find(
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

  async getSummary() {
    const totalStudents = await this.cache.wrap<number>(
      'student:total',
      async () => this.repository.getTotalEntity(),
    );
    const studentEnrolled = await this.cache.wrap<number>(
      'student:enrolled',
      async () => this.repository.entityByStatus(StatusApplication.Enrolled),
    );

    return {
      totalStudents,
      studentEnrolled,
    };
  }

  async getRegistrationMonitoring(
    userId: string,
  ): Promise<RegistrationMonitoringDtoOutput[]> {
    const students = await this.repository.getRegistrationMonitoring(userId);
    return students.map((student) => {
      return {
        id: student.inscriptionCourse.id,
        studentId: student.id,
        partnerCourseName: student.partnerPrepCourse.geo.name,
        inscriptionName: student.inscriptionCourse.name,
        status: student.applicationStatus,
        logs: student.logs,
        createdAt: student.createdAt,
      };
    });
  }

  async generateEnrollmentCertificate(studentId: string, userId: string) {
    const student = await this.repository.findOneForCertificate(studentId);

    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }

    // Verifica se o estudante requisitante é o mesmo do certificado
    if (student.userId !== userId) {
      throw new HttpException(
        'Você não tem permissão para acessar esta declaração',
        HttpStatus.FORBIDDEN,
      );
    }

    // Verifica se o estudante está matriculado
    if (student.applicationStatus !== StatusApplication.Enrolled) {
      throw new HttpException(
        'Apenas estudantes matriculados podem solicitar a declaração',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verifica se o estudante tem uma turma atribuída
    if (!student.class || !student.class.coursePeriod) {
      throw new HttpException(
        'Estudante não possui turma atribuída',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Busca os logos do cursinho parceiro e do VcNaFacul
    let logoPartner = '';
    let logoVcNaFacul = '';

    try {
      if (student.partnerPrepCourse.logo) {
        const logoFile = await this.getPartnerLogo(
          student.partnerPrepCourse.logo,
        );
        logoPartner = logoFile.buffer;
      }
    } catch (error) {
      this.logger.warn(
        `Erro ao buscar logo do cursinho parceiro: ${error.message}`,
      );
    }

    try {
      // Logo do VcNaFacul (fixo no bucket)
      const vcnafaculLogoFile = await this.getVcNaFaculLogo();
      logoVcNaFacul = vcnafaculLogoFile.buffer;
    } catch (error) {
      this.logger.warn(`Erro ao buscar logo do VcNaFacul: ${error.message}`);
    }

    // Prepara os dados para o certificado
    const studentName = student.user.useSocialName
      ? `${student.user.socialName} ${student.user.lastName}`
      : `${student.user.firstName} ${student.user.lastName}`;

    const enrollmentData: EnrollmentCertificate = {
      logo: logoPartner,
      logoVcNaFacul: logoVcNaFacul,
      geo: {
        name: student.partnerPrepCourse.geo.name,
        email: student.partnerPrepCourse.geo.email,
        cep: student.partnerPrepCourse.geo.cep,
        state: student.partnerPrepCourse.geo.state,
        city: student.partnerPrepCourse.geo.city,
        neighborhood: student.partnerPrepCourse.geo.neighborhood,
        street: student.partnerPrepCourse.geo.street,
        number: student.partnerPrepCourse.geo.number,
        complement: student.partnerPrepCourse.geo.complement || '',
      },
      student: {
        name: studentName,
        cpf: student.cpf,
      },
      enrollmentCode: student.cod_enrolled,
      coursePeriod: {
        startDate: student.class.coursePeriod.startDate,
        endDate: student.class.coursePeriod.endDate,
      },
    };

    // Obtém a URL do frontend para o QR Code
    // Se não estiver configurado, usa uma URL padrão
    const frontendUrl = this.envService.get('FRONT_URL');

    // Gera o PDF
    const pdfFile = await createEnrollmentCertificate(
      enrollmentData,
      frontendUrl,
    );

    return pdfFile;
  }

  private async getVcNaFaculLogo() {
    const vcnafaculLogoFile = await this.cache.wrap<
      | {
          buffer: string;
          contentType: string;
        }
      | any
    >(
      'vcnafacul:logo',
      async () =>
        await this.blobService.getFile(
          'logo-vcnafacul.png',
          this.envService.get('BUCKET_DOC'),
        ),
    );
    return vcnafaculLogoFile;
  }

  private async getPartnerLogo(partnerId: string) {
    const partnerLogoFile = await this.cache.wrap<
      | {
          buffer: string;
          contentType: string;
        }
      | any
    >(
      `partner:logo:${partnerId}`,
      async () =>
        await this.blobService.getFile(
          partnerId,
          this.envService.get('BUCKET_PARTNERSHIP_DOC'),
        ),
    );
    return partnerLogoFile;
  }

  async verifyEnrollmentStatus(
    cpf: string,
    enrollmentCode: string,
  ): Promise<VerifyEnrollmentStatusDtoOutput> {
    // Remove caracteres não numéricos do CPF e formata para o padrão do banco (xxx.xxx.xxx-xx)
    const cleanCpf = cpf.replace(/\D/g, '');
    const formattedCpf = cleanCpf.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4',
    );

    const student = await this.repository.findOneByCpfAndEnrollmentCode(
      formattedCpf,
      enrollmentCode,
    );

    if (!student) {
      return {
        isEnrolled: false,
        message:
          'Não foi encontrado estudante com o CPF e código de matrícula informados.',
      };
    }

    // Verifica se o estudante está matriculado
    if (student.applicationStatus !== StatusApplication.Enrolled) {
      return {
        isEnrolled: false,
        message: 'O aluno não está matriculado no cursinho.',
      };
    }

    // Verifica se o estudante tem uma turma atribuída
    if (!student.class || !student.class.coursePeriod) {
      return {
        isEnrolled: false,
        message:
          'O estudante está matriculado, mas ainda não possui turma atribuída.',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas a data

    const startDate = new Date(student.class.coursePeriod.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(student.class.coursePeriod.endDate);
    endDate.setHours(0, 0, 0, 0);

    const courseName = student.partnerPrepCourse.geo.name;

    // Formata as datas
    const startDateFormatted = startDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const endDateFormatted = endDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let message: string;
    let periodStatus: EnrollmentPeriodStatus;

    // Verifica o status do período letivo
    if (today < startDate) {
      // Período ainda não começou
      periodStatus = EnrollmentPeriodStatus.NOT_STARTED;
      message = `O estudante iniciará no ${courseName} na data ${startDateFormatted}. Período letivo: ${startDateFormatted} a ${endDateFormatted}.`;
    } else if (today >= startDate && today <= endDate) {
      // Período em andamento
      periodStatus = EnrollmentPeriodStatus.IN_PROGRESS;
      message = `O estudante é aluno do ${courseName} no período em questão (${startDateFormatted} a ${endDateFormatted}).`;
    } else {
      // Período finalizado
      periodStatus = EnrollmentPeriodStatus.FINISHED;
      message = `O estudante não é mais aluno do ${courseName}, pois o período letivo já finalizou em ${endDateFormatted}.`;
    }

    return {
      isEnrolled: true,
      message,
      periodStatus,
      courseInfo: {
        name: courseName,
        startDate: student.class.coursePeriod.startDate,
        endDate: student.class.coursePeriod.endDate,
      },
    };
  }
}
