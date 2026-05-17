import { Injectable } from '@nestjs/common';
import { QueueProducer } from '../../../../../shared/modules/queue/queue.producer';

export const ANALYTICS_STREAM = 'stream:vcnafacul:analytics-recalc';

@Injectable()
export class AnalyticsQueueService {
  constructor(private readonly producer: QueueProducer) {}

  async enqueue(classId: string, month: string): Promise<string> {
    return this.producer.publish(ANALYTICS_STREAM, { classId, month });
  }

  async enqueueMany(
    items: Array<{ classId: string; month: string }>,
  ): Promise<string[]> {
    return Promise.all(items.map((i) => this.enqueue(i.classId, i.month)));
  }
}
