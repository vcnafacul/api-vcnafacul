import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleRepository } from './role.repository';
import { RoleService } from './role.service';
import { RoleExistValidator } from './validator/role-exist.validator';
import { UserModule } from '../user/user.module';

@Module({
  imports: [HttpModule, UserModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository, RoleExistValidator],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
