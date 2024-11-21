import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as dayjs from 'dayjs';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { CreateUserDtoInput } from 'src/modules/user/dto/create.dto.input';
import { CreateFlow } from 'src/modules/user/enum/create-flow';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
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
import { S3Buckets } from './enums/s3-buckets';
import { LegalGuardian } from './legal-guardian/legal-guardian.entity';
import { LegalGuardianRepository } from './legal-guardian/legal-guardian.repository';
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
    const exprires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
    await Promise.all(
      files.map(async (file) => {
        const fileKey = await this.blobService.uploadFile(
          file,
          S3Buckets.STUDENT_COURSE,
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
  }

  async getDocument(fileKey: string) {
    const file = await this.blobService.getFile(
      fileKey,
      S3Buckets.STUDENT_COURSE,
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
    student.isFree = isFree;
    await this.repository.update(student);
  }

  async updateApplicationStatusInfo(id: string, status: Status) {
    const student = await this.repository.findOneBy({ id });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (status === Status.Rejected) {
      student.enrolled = undefined;
      student.selectEnrolled = false;
      if (student.waitingList) {
        const inscription = await this.inscriptionCourseService.findOneBy({
          id: student.inscriptionCourse.id,
        });
        await this.inscriptionCourseService.removeStudentWaitingList(
          student,
          inscription,
        );
        student.waitingList = false;
      }
    }
    student.applicationStatus = status;
    await this.repository.update(student);
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
    if (!enrolled) {
      student.enrolled = undefined;
      student.selectEnrolled = false;
    } else {
      student.selectEnrolled = true;
      student.applicationStatus = Status.Approved;
    }
    if (student.waitingList) {
      await this.inscriptionCourseService.removeStudentWaitingList(
        student,
        inscription,
      );
      student.waitingList = false;
    }

    await this.repository.update(student);
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
