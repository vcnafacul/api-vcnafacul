import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { QueueConsumer } from '../queue.consumer';
import { MessageHandler } from '../queue.types';

type Registration = {
  stream: string;
  group: string;
  consumer: string;
  handler: MessageHandler;
};

@Injectable()
export class ValkeyQueueConsumer
  extends QueueConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ValkeyQueueConsumer.name);
  private running = false;
  private readonly registrations: Registration[] = [];

  constructor(@Inject('QUEUE_REDIS_CLIENT') private readonly redis: Redis) {
    super();
  }

  register(
    stream: string,
    group: string,
    consumer: string,
    handler: MessageHandler,
  ) {
    this.registrations.push({ stream, group, consumer, handler });
  }

  async onModuleInit() {
    for (const { stream, group } of this.registrations) {
      await this.ensureGroup(stream, group);
    }
    this.running = true;
    this.poll().catch((err) => this.logger.error('Polling error:', err));
  }

  onModuleDestroy() {
    this.running = false;
  }

  private async ensureGroup(stream: string, group: string) {
    try {
      await this.redis.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) throw err;
    }
  }

  private async poll() {
    while (this.running) {
      for (const reg of this.registrations) {
        await this.readAndProcess(reg);
        await this.reclaimStale(reg);
      }
    }
  }

  private async readAndProcess({
    stream,
    group,
    consumer,
    handler,
  }: Registration) {
    const results = (await this.redis.xreadgroup(
      'GROUP',
      group,
      consumer,
      'COUNT',
      '10',
      'BLOCK',
      '2000',
      'STREAMS',
      stream,
      '>',
    )) as [string, [string, string[]][]][] | null;

    if (!results) return;

    for (const [, messages] of results) {
      for (const [id, rawFields] of messages) {
        const fields = this.parseFields(rawFields);
        try {
          await handler(id, fields);
          await this.redis.xack(stream, group, id);
          await this.redis.xdel(stream, id);
        } catch (err) {
          this.logger.error(`Failed processing ${id} from ${stream}:`, err);
        }
      }
    }
  }

  private async reclaimStale({
    stream,
    group,
    consumer,
    handler,
  }: Registration) {
    if (!this.running) return;

    await new Promise((r) => setTimeout(r, 100));

    try {
      const result = await this.redis.xautoclaim(
        stream,
        group,
        consumer,
        '60000',
        '0-0',
        'COUNT',
        '5',
      );

      if (!result) return;

      const [, messages] = result as [string, [string, string[]][], string[]];

      for (const [id, rawFields] of messages) {
        const fields = this.parseFields(rawFields);
        try {
          await handler(id, fields);
          await this.redis.xack(stream, group, id);
          await this.redis.xdel(stream, id);
        } catch (err) {
          this.logger.error(`Failed reclaiming ${id} from ${stream}:`, err);
        }
      }
    } catch (err) {
      this.logger.error(`Reclaim process error for ${stream}:`, err);
    }
  }

  private parseFields(raw: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < raw.length; i += 2) {
      result[raw[i]] = raw[i + 1];
    }
    return result;
  }
}
