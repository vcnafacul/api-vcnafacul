import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { InscriptionCourseService } from '../InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { CreateStudentCourseInput } from './dtos/create-student-course.dto.input';
import { CreateStudentCourseOutput } from './dtos/create-student-course.dto.output';
import { GetAllStudentDtoInput } from './dtos/get-all-student.dto.input';
import {
  GetAllStudentDtoOutput,
  toGetAllStudentDtoOutput,
} from './dtos/get-all-student.dto.output';
import { StudentCourse } from './student-course.entity';
import { StudentCourseRepository } from './student-course.repository';

@Injectable()
export class StudentCourseService extends BaseService<StudentCourse> {
  constructor(
    private readonly repository: StudentCourseRepository,
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
}
