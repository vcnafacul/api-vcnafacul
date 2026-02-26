import { Module, forwardRef } from '@nestjs/common';
import { GeoModule } from 'src/modules/geo/geo.module';
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
  imports: [
    UserModule,
    forwardRef(() => CollaboratorModule),
    RoleModule,
    BlobModule,
    GeoModule,
    EnvModule,
  ],
  providers: [
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    PartnerPrepCourseExistValidator,
    EmailService,
    LogPartnerRepository,
  ],
  exports: [
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    LogPartnerRepository,
  ],
})
export class PartnerPrepCourseModule {}
