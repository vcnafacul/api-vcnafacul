import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { ClassModule } from '../class.module';
import { ClassEssayAnalyticsModule } from '../essay-analytics/class-essay-analytics.module';
import { ClassAnalyticsController } from './class-analytics.controller';
import { ClassAnalyticsService } from './class-analytics.service';
import { AnalyticsCronService } from './crons/analytics-cron.service';
import { AnalyticsQueueModule } from './queue/analytics-queue.module';
import { AnalyticsWorkerService } from './queue/analytics-worker.service';

@Module({
  imports: [
    ClassModule,
    EnvModule,
    UserModule,
    HttpModule,
    AnalyticsQueueModule,
    ClassEssayAnalyticsModule,
  ],
  controllers: [ClassAnalyticsController],
  providers: [
    ClassAnalyticsService,
    AnalyticsWorkerService,
    AnalyticsCronService,
    SimuladoHttpService,
    HttpServiceAxiosFactory,
  ],
})
export class ClassAnalyticsModule {}
