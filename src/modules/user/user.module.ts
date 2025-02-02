import { Module } from '@nestjs/common';
import { EmailService } from 'src/shared/services/email/email.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RoleModule } from '../role/role.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { EmailExistValidator } from './validator/email-exist.validator';
import { EmailUniqueValidator } from './validator/email-unique.validator';
import { UserExistValidator } from './validator/user-exist.validator';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';

@Module({
  controllers: [UserController],
  imports: [RoleModule, AuditLogModule, UserRoleModule],
  providers: [
    UserService,
    UserRepository,
    EmailUniqueValidator,
    UserExistValidator,
    EmailExistValidator,
    EmailService,
    CollaboratorRepository,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
