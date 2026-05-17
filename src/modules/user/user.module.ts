import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CollaboratorFrenteRepository } from '../prepCourse/collaborator/collaborator-frente.repository';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';
import { FrenteProxyService } from '../simulado/frente/frente.service';
import { MateriaProxyService } from '../simulado/materia/materia.service';
import { StudentCourseRepository } from '../prepCourse/studentCourse/student-course.repository';
import { RoleRepository } from '../role/role.repository';
import {
  ProfileDetectorService,
  STUDENT_COURSE_REPO_TOKEN,
  COLLABORATOR_REPO_TOKEN,
} from './services/profile-detector.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { GoogleStrategy } from './strategy/google.strategy';
import { EmailExistValidator } from './validator/email-exist.validator';
import { EmailUniqueValidator } from './validator/email-unique.validator';
import { UserExistValidator } from './validator/user-exist.validator';

@Module({
  controllers: [UserController],
  imports: [AuditLogModule, EnvModule, HttpModule],
  providers: [
    UserService,
    UserRepository,
    RefreshTokenService,
    EmailUniqueValidator,
    UserExistValidator,
    EmailExistValidator,
    EmailService,
    CollaboratorRepository,
    CollaboratorFrenteRepository,
    FrenteProxyService,
    MateriaProxyService,
    HttpServiceAxiosFactory,
    RoleRepository,
    StudentCourseRepository,
    DiscordWebhook,
    ProfileDetectorService,
    GoogleStrategy,
    {
      provide: STUDENT_COURSE_REPO_TOKEN,
      useExisting: StudentCourseRepository,
    },
    { provide: COLLABORATOR_REPO_TOKEN, useExisting: CollaboratorRepository },
  ],
  exports: [UserService, UserRepository, RefreshTokenService],
})
export class UserModule {}
