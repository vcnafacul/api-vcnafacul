import { Module } from '@nestjs/common';
import { SimuladoController } from './simulado.controller';
import { SimuladoService } from './simulado.service';
import { HttpModule } from '@nestjs/axios';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { UserRoleService } from '../user-role/user-role.service';
import { UserRoleRepository } from '../user-role/user-role.repository';
import { ProvaController } from './prova/prova.controller';
import { ProvaService } from './prova/prova.service';
import { QuestaoController } from './questao/questao.controller';
import { QuestaoService } from './questao/questao.service';

@Module({
  imports: [HttpModule],
  controllers: [SimuladoController, ProvaController, QuestaoController],
  providers: [
    SimuladoService,
    AuditLogService,
    AuditLogRepository,
    PermissionsGuard,
    UserRoleService,
    UserRoleRepository,
    ProvaService,
    QuestaoService,
  ],
})
export class SimuladoModule {}
