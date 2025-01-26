import { Module } from '@nestjs/common';
import { RoleModule } from 'src/modules/role/role.module';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { UserModule } from 'src/modules/user/user.module';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { EmailService } from 'src/shared/services/email/email.service';
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
  imports: [
    BlobModule,
    UserModule,
    RoleModule,
    UserRoleModule,
    CollaboratorModule,
  ],
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
  ],
  exports: [StudentCourseService, StudentCourseRepository],
})
export class StudentCourseModule {}
