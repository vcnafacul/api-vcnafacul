import { Module } from '@nestjs/common';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { UserModule } from 'src/modules/user/user.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { CollaboratorController } from './collaborator.controller';
import { CollaboratorRepository } from './collaborator.repository';
import { CollaboratorService } from './collaborator.service';

@Module({
  controllers: [CollaboratorController],
  imports: [UserModule, UserRoleModule],
  providers: [
    CollaboratorRepository,
    CollaboratorService,
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    EmailService,
    LogGeoRepository,
  ],
  exports: [CollaboratorRepository, CollaboratorService],
})
export class CollaboratorModule {}
