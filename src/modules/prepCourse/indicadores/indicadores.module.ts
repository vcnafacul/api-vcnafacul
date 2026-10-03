import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RelatorioHttpService } from 'src/modules/simulado/relatorio/relatorio-http.service';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { CalculoDosIndicadores } from './calculo-dos-indicadores';
import { DesempenhoService } from './desempenho.service';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresRepository } from './indicadores.repository';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresTask } from './indicadores.task';

@Module({
  imports: [PartnerPrepCourseModule, UserModule, EnvModule, HttpModule],
  controllers: [IndicadoresController],
  providers: [
    IndicadoresRepository,
    CalculoDosIndicadores,
    IndicadoresService,
    IndicadoresTask,
    DesempenhoService,
    RelatorioHttpService,
    SimuladoHttpService,
    HttpServiceAxiosFactory,
  ],
  exports: [IndicadoresService],
})
export class IndicadoresModule {}
