import { Module } from '@nestjs/common';
import { QueueModule } from 'src/shared/modules/queue/queue.module';
import { AnalyticsQueueService } from './analytics-queue.service';

@Module({
  imports: [QueueModule],
  providers: [AnalyticsQueueService],
  exports: [AnalyticsQueueService],
})
export class AnalyticsQueueModule {}
