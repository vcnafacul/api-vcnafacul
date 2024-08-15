import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UserRoleRepository } from '../user-role/user-role.repository';
import { UserRoleService } from '../user-role/user-role.service';
import { RoleController } from './role.controller';
import { RoleRepository } from './role.repository';
import { RoleService } from './role.service';
import { RoleExistValidator } from './validator/role-exist.validator';

@Module({
  imports: [HttpModule],
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
    HttpServiceAxios,
  ],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
