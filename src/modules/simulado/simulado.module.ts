import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UserRoleRepository } from '../user-role/user-role.repository';
import { UserRoleService } from '../user-role/user-role.service';
import { UserModule } from '../user/user.module';
import { HistoricoController } from './historico/historico.controller';
import { HistoricoService } from './historico/historico.service';
import { ProvaController } from './prova/prova.controller';
import { ProvaService } from './prova/prova.service';
import { QuestaoController } from './questao/questao.controller';
import { QuestaoService } from './questao/questao.service';
import { SimuladoController } from './simulado.controller';
import { SimuladoService } from './simulado.service';

@Module({
  imports: [HttpModule, UserModule],
  controllers: [
    SimuladoController,
    ProvaController,
    QuestaoController,
    HistoricoController,
  ],
  providers: [
    SimuladoService,
    AuditLogService,
    AuditLogRepository,
    PermissionsGuard,
    UserRoleService,
    UserRoleRepository,
    ProvaService,
    QuestaoService,
    HistoricoService,
    HttpServiceAxios,
  ],
})
export class SimuladoModule {}
