import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleRepository } from './role.repository';
import { RoleExistValidator } from './validator/role-exist.validator';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { UserRoleRepository } from '../user-role/user-role.repository';
import { UserRoleService } from '../user-role/user-role.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogRepository } from '../audit-log/audit-log.repository';

@Module({
  controllers: [RoleController],
  providers: [
    RoleService,
    RoleRepository,
    RoleExistValidator,
    PermissionsGuard,
    UserRoleService,
    UserRoleRepository,
    AuditLogService,
    AuditLogRepository,
  ],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
