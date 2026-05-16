import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { ClassModule } from '../class.module';
import { ClassAnalyticsController } from './class-analytics.controller';
import { ClassAnalyticsService } from './class-analytics.service';

@Module({
  imports: [ClassModule, EnvModule],
  controllers: [ClassAnalyticsController],
  providers: [ClassAnalyticsService, SimuladoHttpService, HttpServiceAxiosFactory],
})
export class ClassAnalyticsModule {}
