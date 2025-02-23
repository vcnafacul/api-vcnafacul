import { Module } from '@nestjs/common';
import { EmailService } from 'src/shared/services/email/email.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';
import { RoleRepository } from '../role/role.repository';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { EmailExistValidator } from './validator/email-exist.validator';
import { EmailUniqueValidator } from './validator/email-unique.validator';
import { UserExistValidator } from './validator/user-exist.validator';

@Module({
  controllers: [UserController],
  imports: [AuditLogModule],
  providers: [
    UserService,
    UserRepository,
    EmailUniqueValidator,
    UserExistValidator,
    EmailExistValidator,
    EmailService,
    CollaboratorRepository,
    RoleRepository,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
