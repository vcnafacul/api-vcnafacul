import { Module } from '@nestjs/common';
import { RoleModule } from 'src/modules/role/role.module';
import { RoleRepository } from 'src/modules/role/role.repository';
import { UserModule } from 'src/modules/user/user.module';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { CoursePeriodRepository } from '../coursePeriod/course-period.repository';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { ClassController } from './class.controller';
import { ClassRepository } from './class.repository';
import { ClassService } from './class.service';

@Module({
  controllers: [ClassController],
  imports: [PartnerPrepCourseModule, UserModule, RoleModule, EnvModule],
  providers: [
    ClassRepository,
    ClassService,
    UserService,
    UserRepository,
    RoleRepository,
    EmailService,
    CollaboratorRepository,
    CoursePeriodRepository,
    DiscordWebhook,
    StudentCourseRepository,
  ],
  exports: [ClassRepository, ClassService, UserService, UserRepository],
})
export class ClassModule {}
