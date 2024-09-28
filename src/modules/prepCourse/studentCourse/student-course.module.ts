import { Module } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { InscriptionCourseRepository } from '../InscriptionCourse/inscription-course.repository';
import { InscriptionCourseService } from '../InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { DocumentStudentRepository } from './documents/document-students.repository';
import { LegalGuardianRepository } from './legal-guardian/legal-guardian.repository';
import { StudentCourseController } from './student-course.controller';
import { StudentCourseRepository } from './student-course.repository';
import { StudentCourseService } from './student-course.service';

@Module({
  controllers: [StudentCourseController],
  imports: [BlobModule, UserModule],
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
  ],
  exports: [StudentCourseService, StudentCourseRepository],
})
export class StudentCourseModule {}
