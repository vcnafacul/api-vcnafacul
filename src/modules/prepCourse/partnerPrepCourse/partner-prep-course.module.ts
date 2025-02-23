import { Module } from '@nestjs/common';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { UserModule } from 'src/modules/user/user.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { CollaboratorModule } from '../collaborator/collaborator.module';
import { PartnerPrepCourseController } from './partner-prep-course.controller';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';
import { PartnerPrepCourseService } from './partner-prep-course.service';
import { PartnerPrepCourseExistValidator } from './validator/partner-pret-course-exist.validator';

@Module({
  controllers: [PartnerPrepCourseController],
  imports: [UserModule, CollaboratorModule],
  providers: [
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    PartnerPrepCourseExistValidator,
    EmailService,
    LogGeoRepository,
  ],
  exports: [PartnerPrepCourseService, PartnerPrepCourseRepository],
})
export class PartnerPrepCourseModule {}
