import { Injectable } from '@nestjs/common';
import { QueueProducer } from '../../../../../shared/modules/queue/queue.producer';

export const ANALYTICS_STREAM = 'stream:vcnafacul:analytics-recalc';

export type AnalyticsJobType = 'simulado' | 'essay';

@Injectable()
export class AnalyticsQueueService {
  constructor(private readonly producer: QueueProducer) {}

  async enqueue(
    classId: string,
    month: string,
    type: AnalyticsJobType = 'simulado',
  ): Promise<string> {
    return this.producer.publish(ANALYTICS_STREAM, { classId, month, type });
  }

  async enqueueMany(
    items: Array<{ classId: string; month: string; type?: AnalyticsJobType }>,
  ): Promise<string[]> {
    return Promise.all(
      items.map((i) => this.enqueue(i.classId, i.month, i.type)),
    );
  }
}
