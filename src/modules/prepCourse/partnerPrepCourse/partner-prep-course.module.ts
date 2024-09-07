import { Module } from '@nestjs/common';
import { PartnerPrepCourseController } from './partner-prep-course.controller';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';
import { PartnerPrepCourseService } from './partner-prep-course.service';

@Module({
  controllers: [PartnerPrepCourseController],
  imports: [],
  providers: [PartnerPrepCourseService, PartnerPrepCourseRepository],
  exports: [PartnerPrepCourseService, PartnerPrepCourseRepository],
})
export class PartnerPrepCourseModule {}
