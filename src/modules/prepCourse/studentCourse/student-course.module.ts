import { Module } from '@nestjs/common';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { DocumentStudentRepository } from './documents/document-students.repository';
import { StudentCourseController } from './student-course.controller';
import { StudentCourseRepository } from './student-course.repository';
import { StudentCourseService } from './student-course.service';

@Module({
  controllers: [StudentCourseController],
  imports: [BlobModule],
  providers: [
    StudentCourseService,
    StudentCourseRepository,
    DocumentStudentRepository,
  ],
  exports: [StudentCourseService, StudentCourseRepository],
})
export class StudentCourseModule {}
