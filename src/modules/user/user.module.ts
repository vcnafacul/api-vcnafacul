import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { EmailUniqueValidator } from './validator/email-unique.validator';
import { UserExistValidator } from './validator/user-exist.validator';
import { EmailService } from 'src/shared/services/email.service';
import { RoleModule } from '../role/role.module';
import { EmailExistValidator } from './validator/email-exist.validator';

@Module({
  controllers: [UserController],
  imports: [RoleModule],
  providers: [
    UserService,
    UserRepository,
    EmailUniqueValidator,
    UserExistValidator,
    EmailExistValidator,
    EmailService,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
