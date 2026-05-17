import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { QueueModule } from 'src/shared/modules/queue/queue.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { ClassModule } from '../class.module';
import { ClassAnalyticsController } from './class-analytics.controller';
import { ClassAnalyticsService } from './class-analytics.service';
import { AnalyticsCronService } from './crons/analytics-cron.service';
import { AnalyticsQueueService } from './queue/analytics-queue.service';
import { AnalyticsWorkerService } from './queue/analytics-worker.service';

@Module({
  imports: [ClassModule, EnvModule, UserModule, HttpModule, QueueModule],
  controllers: [ClassAnalyticsController],
  providers: [
    ClassAnalyticsService,
    AnalyticsQueueService,
    AnalyticsWorkerService,
    AnalyticsCronService,
    SimuladoHttpService,
    HttpServiceAxiosFactory,
  ],
})
export class ClassAnalyticsModule {}
