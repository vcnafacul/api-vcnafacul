import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { AnalyticsQueueModule } from '../analytics/queue/analytics-queue.module';
import { ClassModule } from '../class.module';
import { ClassEssayAnalyticsController } from './class-essay-analytics.controller';
import { ClassEssayAnalyticsRepository } from './class-essay-analytics.repository';
import { ClassEssayAnalyticsService } from './class-essay-analytics.service';
import { ClassEssaySnapshot } from './class-essay-snapshot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassEssaySnapshot]),
    AnalyticsQueueModule,
    ClassModule,
    UserModule,
    EnvModule,
  ],
  controllers: [ClassEssayAnalyticsController],
  providers: [ClassEssayAnalyticsService, ClassEssayAnalyticsRepository],
  exports: [ClassEssayAnalyticsService],
})
export class ClassEssayAnalyticsModule {}
