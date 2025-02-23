import { Module } from '@nestjs/common';
import { RoleRepository } from 'src/modules/role/role.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { ClassController } from './class.controller';
import { ClassRepository } from './class.repository';
import { ClassService } from './class.service';

@Module({
  controllers: [ClassController],
  imports: [PartnerPrepCourseModule],
  providers: [
    ClassRepository,
    ClassService,
    UserService,
    UserRepository,
    RoleRepository,
    EmailService,
    CollaboratorRepository,
  ],
  exports: [ClassRepository, ClassService, UserService, UserRepository],
})
export class ClassModule {}
