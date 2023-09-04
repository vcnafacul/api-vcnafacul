import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleRepository } from './role.repository';
import { RoleExistValidator } from './validator/role-exist.validator';

@Module({
  controllers: [RoleController],
  providers: [RoleService, RoleRepository, RoleExistValidator],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
