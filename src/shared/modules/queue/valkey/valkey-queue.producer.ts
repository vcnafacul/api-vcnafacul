import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { QueueProducer } from '../queue.producer';

@Injectable()
export class ValkeyQueueProducer extends QueueProducer {
  private readonly logger = new Logger(ValkeyQueueProducer.name);

  constructor(@Inject('QUEUE_REDIS_CLIENT') private readonly redis: Redis) {
    super();
  }

  async publish(
    stream: string,
    payload: Record<string, string>,
  ): Promise<string> {
    const id = await this.redis.xadd(
      stream,
      'MAXLEN',
      '~',
      '10000',
      '*',
      ...Object.entries(payload).flat(),
    );
    this.logger.debug(`Published ${id} → ${stream}`);
    return id as string;
  }
}
