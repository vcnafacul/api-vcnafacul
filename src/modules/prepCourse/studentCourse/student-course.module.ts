import { Module } from '@nestjs/common';
import { InscriptionCourseModule } from '../InscriptionCourse/inscription-course.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { StudentCourseController } from './student-course.controller';
import { StudentCourseRepository } from './student-course.repository';
import { StudentCourseService } from './student-course.service';

@Module({
  controllers: [StudentCourseController],
  imports: [InscriptionCourseModule, PartnerPrepCourseModule],
  providers: [StudentCourseService, StudentCourseRepository],
  exports: [StudentCourseService, StudentCourseRepository],
})
export class StudentCourseModule {}
