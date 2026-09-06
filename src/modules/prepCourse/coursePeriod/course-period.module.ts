import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { CoursePeriodController } from './course-period.controller';
import { CoursePeriod } from './course-period.entity';
import { CoursePeriodRepository } from './course-period.repository';
import { CoursePeriodService } from './course-period.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoursePeriod]),
    PartnerPrepCourseModule,
    UserModule,
    EnvModule,
  ],
  controllers: [CoursePeriodController],
  providers: [
    CoursePeriodService,
    CoursePeriodRepository,
    StudentCourseRepository,
    DiscordWebhook,
  ],
  exports: [CoursePeriodService, CoursePeriodRepository],
})
export class CoursePeriodModule {}
