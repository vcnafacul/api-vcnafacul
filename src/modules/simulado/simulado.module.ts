import { Module } from '@nestjs/common';
import { SimuladoController } from './simulado.controller';
import { SimuladoService } from './simulado.service';
import { HttpModule } from '@nestjs/axios';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { UserRoleService } from '../user-role/user-role.service';
import { UserRoleRepository } from '../user-role/user-role.repository';

@Module({
  imports: [HttpModule],
  controllers: [SimuladoController],
  providers: [
    SimuladoService,
    AuditLogService,
    AuditLogRepository,
    PermissionsGuard,
    UserRoleService,
    UserRoleRepository,
  ],
})
export class SimuladoModule {}
