import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';
import { StudentCourseRepository } from '../prepCourse/studentCourse/student-course.repository';
import { RoleRepository } from '../role/role.repository';
import { RefreshTokenService } from './services/refresh-token.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { EmailExistValidator } from './validator/email-exist.validator';
import { EmailUniqueValidator } from './validator/email-unique.validator';
import { UserExistValidator } from './validator/user-exist.validator';

@Module({
  controllers: [UserController],
  imports: [AuditLogModule, EnvModule],
  providers: [
    UserService,
    UserRepository,
    RefreshTokenService,
    EmailUniqueValidator,
    UserExistValidator,
    EmailExistValidator,
    EmailService,
    CollaboratorRepository,
    RoleRepository,
    StudentCourseRepository,
    DiscordWebhook,
  ],
  exports: [UserService, UserRepository, RefreshTokenService],
})
export class UserModule {}
