import { Module } from '@nestjs/common';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { RoleRepository } from 'src/modules/role/role.repository';
import { RoleService } from 'src/modules/role/role.service';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { CollaboratorController } from './collaborator.controller';
import { CollaboratorRepository } from './collaborator.repository';
import { CollaboratorService } from './collaborator.service';

@Module({
  controllers: [CollaboratorController],
  imports: [UserModule, BlobModule, EnvModule],
  providers: [
    CollaboratorRepository,
    CollaboratorService,
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    EmailService,
    LogGeoRepository,
    RoleService,
    RoleRepository,
  ],
  exports: [CollaboratorRepository, CollaboratorService],
})
export class CollaboratorModule {}
