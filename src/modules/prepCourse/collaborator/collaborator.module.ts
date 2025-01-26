import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserModule } from 'src/modules/user/user.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { CollaboratorController } from './collaborator.controller';
import { CollaboratorRepository } from './collaborator.repository';
import { CollaboratorService } from './collaborator.service';

@Module({
  controllers: [CollaboratorController],
  imports: [UserModule],
  providers: [
    CollaboratorRepository,
    CollaboratorService,
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    EmailService,
    JwtService,
  ],
  exports: [CollaboratorRepository, CollaboratorService],
})
export class CollaboratorModule {}
