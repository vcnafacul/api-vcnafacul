import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { InscriptionCourseService } from '../InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { DocumentStudent } from './documents/document-students.entity';
import { DocumentStudentRepository } from './documents/document-students.repository';
import { CreateStudentCourseInput } from './dtos/create-student-course.dto.input';
import { CreateStudentCourseOutput } from './dtos/create-student-course.dto.output';
import { GetAllStudentDtoInput } from './dtos/get-all-student.dto.input';
import {
  GetAllStudentDtoOutput,
  toGetAllStudentDtoOutput,
} from './dtos/get-all-student.dto.output';
import { S3Buckets } from './enums/s3-buckets';
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
  ) {
    super(repository);
  }

  async create(
    dto: CreateStudentCourseInput,
  ): Promise<CreateStudentCourseOutput> {
    const parnetPrepCourse = await this.partnerPrepCourseService.findOneBy({
      id: dto.partnerPrepCourse,
    });
    const inscriptionCourse =
      await this.inscriptionCourseService.findOneActived(parnetPrepCourse);

    if (!inscriptionCourse) {
      throw new HttpException(
        'not exists active inscription course for this partner prep course',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      inscriptionCourse.students?.find(
        (student) => student.userId === dto.userId,
      )
    ) {
      throw new HttpException(
        'already exists student in this inscription course',
        HttpStatus.BAD_REQUEST,
      );
    }

    const studentCourse: StudentCourse = Object.assign(
      new StudentCourse(),
      dto,
    );
    studentCourse.inscriptionCourses = [inscriptionCourse];

    const result = await this.repository.create(studentCourse);

    if (!inscriptionCourse.students) {
      inscriptionCourse.students = [result];
    } else {
      inscriptionCourse.students.push(result);
    }

    await this.inscriptionCourseService.update(inscriptionCourse);

    return { id: result.id } as CreateStudentCourseOutput;
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
}
