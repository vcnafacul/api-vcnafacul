import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CacheManagerModule } from 'src/shared/modules/cache/cache.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserModule } from '../user/user.module';
import { ContentProxyController } from './content/content.controller';
import { ContentProxyService } from './content/content.service';
import { FrenteProxyController } from './frente/frente.controller';
import { FrenteProxyService } from './frente/frente.service';
import { MateriaProxyController } from './materia/materia.controller';
import { MateriaProxyService } from './materia/materia.service';
import { HistoricoController } from './historico/historico.controller';
import { HistoricoService } from './historico/historico.service';
import { ProvaController } from './prova/prova.controller';
import { ProvaService } from './prova/prova.service';
import { QuestaoController } from './questao/questao.controller';
import { QuestaoService } from './questao/questao.service';
import { SimuladoController } from './simulado.controller';
import { SimuladoService } from './simulado.service';
import { SubjectProxyController } from './subject/subject.controller';
import { SubjectProxyService } from './subject/subject.service';

@Module({
  imports: [
    BlobModule,
    HttpModule,
    UserModule,
    EnvModule,
    CacheManagerModule,
    AuditLogModule,
  ],
  controllers: [
    SimuladoController,
    ProvaController,
    QuestaoController,
    HistoricoController,
    MateriaProxyController,
    FrenteProxyController,
    SubjectProxyController,
    ContentProxyController,
  ],
  providers: [
    SimuladoService,
    ProvaService,
    QuestaoService,
    HistoricoService,
    HttpServiceAxiosFactory,
    MateriaProxyService,
    FrenteProxyService,
    SubjectProxyService,
    ContentProxyService,
  ],
  exports: [FrenteProxyService, MateriaProxyService],
})
export class SimuladoModule {}
