import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { CoursePeriodController } from './course-period.controller';
import { CoursePeriod } from './course-period.entity';
import { CoursePeriodRepository } from './course-period.repository';
import { CoursePeriodService } from './course-period.service';

@Module({
  imports: [TypeOrmModule.forFeature([CoursePeriod])],
  controllers: [CoursePeriodController],
  providers: [
    CoursePeriodService,
    CoursePeriodRepository,
    PartnerPrepCourseRepository,
    StudentCourseRepository,
    DiscordWebhook,
  ],
  exports: [CoursePeriodService, CoursePeriodRepository],
})
export class CoursePeriodModule {}
