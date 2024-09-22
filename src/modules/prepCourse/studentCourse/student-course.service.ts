import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { BlobService } from 'src/shared/services/blob/blob-service';
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

    this.ensureStudentNotAlreadyEnrolled(inscriptionCourse, dto.userId);

    if (
      this.isMinor(dto.birthday) &&
      (!dto.legalGuardian ||
        !dto.legalGuardian.fullName ||
        !dto.legalGuardian.rg ||
        !dto.legalGuardian.uf ||
        !dto.legalGuardian.cpf ||
        !dto.legalGuardian.phone)
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

    await this.addStudentToInscriptionCourse(inscriptionCourse, studentCourse);

    if (this.isMinor(user.birthday)) {
      await this.createLegalGuardian(dto.legalGuardian, studentCourse);
    }

    await this.inscriptionCourseService.update(inscriptionCourse);
    await this.userRepository.update(user);

    return { id: studentCourse.id } as CreateStudentCourseOutput;
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

  async uploadDocument(file: any, userId: string) {
    const resultStudentCourse = await this.repository.findAllBy({
      where: { userId },
      limit: 1000,
      page: 1,
    });
    const exprires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
    const fileKey = await this.blobService.uploadFile(
      file,
      S3Buckets.STUDENT_COURSE,
      exprires,
    );
    await Promise.all(
      resultStudentCourse.data.map(async (studentCourse) => {
        const document: DocumentStudent = new DocumentStudent();
        document.key = fileKey;
        document.exprires = exprires;
        document.name = file.originalname;
        document.studentCourse = studentCourse.id;

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
      (i) => i.actived === true,
    );

    if (!activedInscription) {
      throw new HttpException(
        'No active inscription course',
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
      throw new HttpException('User already inscribed', HttpStatus.BAD_REQUEST);
    }
    return this.userService.me(userId);
  }

  private ensureStudentNotAlreadyEnrolled(
    inscriptionCourse: InscriptionCourse,
    userId: string,
  ) {
    if (
      inscriptionCourse.students?.some((student) => student.userId === userId)
    ) {
      throw new HttpException(
        'Student already enrolled in this inscription course',
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
    });

    studentCourse.inscriptionCourses = [inscriptionCourse];

    return this.repository.create(studentCourse);
  }

  private async addStudentToInscriptionCourse(
    inscriptionCourse: InscriptionCourse,
    studentCourse: StudentCourse,
  ) {
    if (!inscriptionCourse.students) {
      inscriptionCourse.students = [studentCourse];
    } else {
      inscriptionCourse.students.push(studentCourse);
    }
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
}
