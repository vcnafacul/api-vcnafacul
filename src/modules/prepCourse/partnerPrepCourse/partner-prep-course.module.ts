import { Module } from '@nestjs/common';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { CollaboratorModule } from '../collaborator/collaborator.module';
import { LogPartnerRepository } from './log-partner/log-partner.repository';
import { PartnerPrepCourseController } from './partner-prep-course.controller';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';
import { PartnerPrepCourseService } from './partner-prep-course.service';
import { PartnerPrepCourseExistValidator } from './validator/partner-pret-course-exist.validator';

@Module({
  controllers: [PartnerPrepCourseController],
  imports: [UserModule, CollaboratorModule, RoleModule, BlobModule, EnvModule],
  providers: [
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    PartnerPrepCourseExistValidator,
    EmailService,
    LogGeoRepository,
    LogPartnerRepository,
  ],
  exports: [PartnerPrepCourseService, PartnerPrepCourseRepository],
})
export class PartnerPrepCourseModule {}
