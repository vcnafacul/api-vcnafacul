import { Module } from '@nestjs/common';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { RoleModule } from 'src/modules/role/role.module';
import { UserService } from 'src/modules/user/user.service';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { ClassModule } from '../class/class.module';
import { CollaboratorModule } from '../collaborator/collaborator.module';
import { InscriptionCourseRepository } from '../InscriptionCourse/inscription-course.repository';
import { InscriptionCourseService } from '../InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { DocumentStudentRepository } from './documents/document-students.repository';
import { LegalGuardianRepository } from './legal-guardian/legal-guardian.repository';
import { LogStudentRepository } from './log-student/log-student.repository';
import { StudentCourseController } from './student-course.controller';
import { StudentCourseRepository } from './student-course.repository';
import { StudentCourseService } from './student-course.service';

@Module({
  controllers: [StudentCourseController],
  imports: [BlobModule, RoleModule, CollaboratorModule, ClassModule],
  providers: [
    StudentCourseService,
    StudentCourseRepository,
    DocumentStudentRepository,
    InscriptionCourseRepository,
    InscriptionCourseService,
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    LegalGuardianRepository,
    EmailService,
    LogStudentRepository,
    LogGeoRepository,
    UserService,
    DiscordWebhook,
  ],
  exports: [StudentCourseService, StudentCourseRepository, UserService],
})
export class StudentCourseModule {}
