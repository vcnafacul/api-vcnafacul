import { Module } from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { UserRoleController } from './user-role.controller';
import { UserRoleRepository } from './user-role.repository';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  controllers: [UserRoleController],
  imports: [AuditLogModule],
  providers: [UserRoleService, UserRoleRepository],
  exports: [UserRoleService, UserRoleRepository],
})
export class UserRoleModule {}
