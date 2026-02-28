import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { GeoModule } from 'src/modules/geo/geo.module';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { VcnafaculFormModule } from 'src/modules/vcnafacul-form/vcnafacul-form.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { ClassModule } from '../class/class.module';
import { CollaboratorModule } from '../collaborator/collaborator.module';
import { InscriptionCourseModule } from '../InscriptionCourse/inscription-course.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
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
    GeoModule,
    RoleModule,
    UserModule,
    CollaboratorModule,
    ClassModule,
    PartnerPrepCourseModule,
    forwardRef(() => InscriptionCourseModule),
    EnvModule,
    VcnafaculFormModule,
    HttpModule,
  ],
  providers: [
    StudentCourseService,
    StudentCourseRepository,
    DocumentStudentRepository,
    LegalGuardianRepository,
    EmailService,
    LogStudentRepository,
    DiscordWebhook,
    HttpServiceAxiosFactory,
  ],
  exports: [StudentCourseService, StudentCourseRepository],
})
export class StudentCourseModule {}
