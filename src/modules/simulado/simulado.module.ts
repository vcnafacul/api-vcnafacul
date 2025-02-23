import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
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
    ProvaService,
    QuestaoService,
    HistoricoService,
    HttpServiceAxios,
  ],
})
export class SimuladoModule {}
