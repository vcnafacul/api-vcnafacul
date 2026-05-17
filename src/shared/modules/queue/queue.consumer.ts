import { Injectable } from '@nestjs/common';
import { MessageHandler } from './queue.types';

@Injectable()
export abstract class QueueConsumer {
  abstract register(
    stream: string,
    group: string,
    consumer: string,
    handler: MessageHandler,
  ): void;
}
