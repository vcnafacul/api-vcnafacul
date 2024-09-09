import { Module } from '@nestjs/common';
import { StudentCourseController } from './student-course.controller';
import { StudentCourseRepository } from './student-course.repository';
import { StudentCourseService } from './student-course.service';

@Module({
  controllers: [StudentCourseController],
  imports: [],
  providers: [StudentCourseService, StudentCourseRepository],
  exports: [StudentCourseService, StudentCourseRepository],
})
export class StudentCourseModule {}
