import { Module } from '@nestjs/common';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { UserModule } from 'src/modules/user/user.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { CollaboratorModule } from '../collaborator/collaborator.module';
import { PartnerPrepCourseController } from './partner-prep-course.controller';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';
import { PartnerPrepCourseService } from './partner-prep-course.service';
import { PartnerPrepCourseExistValidator } from './validator/partner-pret-course-exist.validator';

@Module({
  controllers: [PartnerPrepCourseController],
  imports: [UserModule, UserRoleModule, CollaboratorModule],
  providers: [
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    PartnerPrepCourseExistValidator,
    EmailService,
  ],
  exports: [PartnerPrepCourseService, PartnerPrepCourseRepository],
})
export class PartnerPrepCourseModule {}
