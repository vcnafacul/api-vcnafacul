import { Injectable } from '@nestjs/common';
import { QueueConsumer } from '../queue.consumer';
import { MessageHandler } from '../queue.types';
import { memoryBus } from './memory-bus';

@Injectable()
export class InMemoryQueueConsumer extends QueueConsumer {
  register(
    stream: string,
    _group: string,
    _consumer: string,
    handler: MessageHandler,
  ) {
    memoryBus.on(stream, (id: string, fields: Record<string, string>) => {
      handler(id, fields).catch((err) =>
        console.error(`[InMemoryQueue] error on ${stream}:`, err),
      );
    });
  }
}
