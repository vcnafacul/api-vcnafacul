import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { CreateStudentCourseInput } from './dtos/create-student-course.dto.input';
import { CreateStudentCourseOutput } from './dtos/create-student-course.dto.output';
import { StudentCourse } from './student-course.entity';
import { StudentCourseRepository } from './student-course.repository';

@Injectable()
export class StudentCourseService extends BaseService<StudentCourse> {
  constructor(private readonly repository: StudentCourseRepository) {
    super(repository);
  }

  async create(
    dto: CreateStudentCourseInput,
  ): Promise<CreateStudentCourseOutput> {
    const studentCourse: StudentCourse = Object.assign(
      new StudentCourse(),
      dto,
    );

    const result = await this.repository.create(studentCourse);
    return { id: result.id } as CreateStudentCourseOutput;
  }
}
