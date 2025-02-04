import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { CreateUserDtoInput } from 'src/modules/user/dto/create.dto.input';
import { CreateFlow } from 'src/modules/user/enum/create-flow';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
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
    private readonly env: EnvService,
  ) {
    super(repository);
  }

  async create(
    dto: CreateStudentCourseInput,
  ): Promise<CreateStudentCourseOutput> {
    const partnerPrepCourse = await this.partnerPrepCourseService.findOneBy({
      id: dto.partnerPrepCourse,
    });

    const inscriptionCourse =
      await this.inscriptionCourseService.findOneActived(partnerPrepCourse);

    if (!inscriptionCourse) {
      throw new HttpException(
        'No active inscription course for this partner prep course',
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
      partnerPrepCourse,
      inscriptionCourse,
    );

    if (this.isMinor(user.birthday)) {
      await this.createLegalGuardian(dto.legalGuardian, studentCourse);
    }

    await this.userRepository.update(user);
    const represent = await this.userService.findOneBy({
      id: partnerPrepCourse.userId,
    });

    const log = new LogStudent();
    log.studentId = studentCourse.id;
    log.applicationStatus = StatusApplication.UnderReview;
    log.description = 'Inscrição realizada';
    await this.logStudentRepository.create(log);

    await this.sendEmailConfirmation(
      dto,
      represent.email,
      partnerPrepCourse.geo.name,
    );
    return { id: studentCourse.id } as CreateStudentCourseOutput;
  }

  async createUser(userDto: CreateUserDtoInput, hashPrepCourse: string) {
    const user = await this.userService.createUser(userDto);
    const token = await this.jwtService.signAsync(
      {
        user: { id: user.id, flow: CreateFlow.CREATE_STUDENT, hashPrepCourse },
      },
      { expiresIn: '2h' },
    );
    await this.emailService.sendCreateUser(user, token);
  }

  async findAllByStudent({
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

  async uploadDocument(files: Array<Express.Multer.File>, userId: string) {
    const student = await this.repository.findOneBy({ id: userId });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90);
    await Promise.all(
      files.map(async (file) => {
        const fileKey = await this.blobService.uploadFile(
          file,
          this.env.get('BUCKET_DOC'),
          expires,
        );
        const document: DocumentStudent = new DocumentStudent();
        document.key = fileKey;
        document.exprires = expires;
        document.name = file.originalname;
        document.studentCourse = student.id;

        await this.documentRepository.create(document);
      }),
    ).then(async () => {
      const log = new LogStudent();
      log.studentId = student.id;
      log.applicationStatus = StatusApplication.SendedDocument;
      log.description = 'Documento enviado';
      await this.logStudentRepository.create(log);
    });
  }

  async getDocument(fileKey: string) {
    const file = await this.blobService.getFile(
      fileKey,
      this.env.get('BUCKET_DOC'),
    );
    return file;
  }

  async profilePhoto(file: Express.Multer.File, userId: string) {
    const student = await this.repository.findOneBy({ id: userId });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    const fileKey = await this.blobService.uploadFile(
      file,
      this.env.get('BUCKET_PROFILE'),
    );
    student.photo = fileKey;
    await this.repository.update(student);
  }

  async getProfilePhoto(fileKey: string) {
    const file = await this.blobService.getFile(
      fileKey,
      this.env.get('BUCKET_PROFILE'),
    );
    return file;
  }

  async getUserInfoToInscription(idPrepCourse: string, userId: string) {
    const prepCourse = await this.partnerPrepCourseService.findOneBy({
      id: idPrepCourse,
    });
    const activedInscription = prepCourse.inscriptionCourses.find(
      (i) => i.actived === Status.Approved,
    );

    if (!activedInscription) {
      throw new HttpException(
        'Não existe inscrição ativa para este curso',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inscription = await this.inscriptionCourseService.findOneBy({
      id: activedInscription.id,
    });

    const hasUser = inscription.students.some(
      (student) => student.userId === userId,
    );
    if (hasUser) {
      throw new HttpException(
        'Você já realizou a inscrição neste Processo Seletivo.',
        HttpStatus.BAD_REQUEST,
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
    if (
      student.applicationStatus === StatusApplication.UnderReview ||
      (student.applicationStatus === StatusApplication.CalledForEnrollment &&
        student.selectEnrolledAt >= new Date())
    ) {
      if (student.enrolled) {
        throw new HttpException(
          'Não é possível alterar status de convocação de estudantes matriculados',
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
        );
      }

      await this.repository.update(student);
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

  async declaredInterest(
    id: string,
    areaInterest: string[],
    selectedCourses: string[],
  ) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante nao encontrado', HttpStatus.NOT_FOUND);
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
    student.applicationStatus = StatusApplication.DeclaredInterest;
    student.areaInterest = JSON.stringify(areaInterest);
    student.selectedCourses = JSON.stringify(selectedCourses);
    await this.repository.update(student);

    const log = new LogStudent();
    log.studentId = student.id;
    log.applicationStatus = StatusApplication.DeclaredInterest;
    log.description = 'Declarou interesse';
    await this.logStudentRepository.create(log);
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
    if (student.waitingList) {
      const inscription = await this.inscriptionCourseService.findOneBy({
        id: student.inscriptionCourse.id,
      });
      student.waitingList = false;
      await this.inscriptionCourseService.removeStudentWaitingList(
        student,
        inscription,
      );
    }
    student.applicationStatus = StatusApplication.UnderReview;
    student.selectEnrolled = false;
    student.waitingList = false;
    student.isFree = true;
    student.selectEnrolledAt = null;
    student.limitEnrolledAt = null;
    await this.repository.update(student);

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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/Sao_Paulo',
  })
  async sendEmailDeclaredInterest() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentTimeInSeconds = Math.floor(today.getTime() / 1000);
    const students = await this.repository.findAllCompletedBy({
      selectEnrolledAt: today,
      applicationStatus: StatusApplication.CalledForEnrollment,
    });
    await Promise.all(
      students.map(async (stu) => {
        const payload = {
          user: { id: stu.id },
        };
        const limitTimeInSeconds = Math.floor(
          stu.limitEnrolledAt.getTime() / 1000,
        );
        const expiresIn = limitTimeInSeconds - currentTimeInSeconds;
        const token = await this.jwtService.signAsync(payload, { expiresIn });
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
      }),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/Sao_Paulo',
  })
  async verifyLostEnrolled() {
    const students = await this.repository.getNotConfirmedEnrolled();
    await this.repository.notConfirmedEnrolled();
    await Promise.all(
      students.map(async (student) => {
        const log = new LogStudent();
        log.studentId = student.id;
        log.applicationStatus = StatusApplication.MissedDeadline;
        log.description = 'Matríocula perdida';
        await this.logStudentRepository.create(log);
      }),
    );
  }

  private async generateEnrolledCode() {
    const year = new Date().getFullYear();
    const lastCode = await this.repository.getLastEnrollmentCode();
    if (!lastCode) {
      return `${year}0001`;
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
      uf: dto.uf,
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
    emailRepresentant: string,
    nome_cursinho: string,
  ) {
    const emailList = [
      student.email,
      emailRepresentant,
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
