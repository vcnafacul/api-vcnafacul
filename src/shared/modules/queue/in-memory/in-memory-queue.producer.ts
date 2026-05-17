import { Injectable } from '@nestjs/common';
import { QueueProducer } from '../queue.producer';
import { memoryBus } from './memory-bus';

@Injectable()
export class InMemoryQueueProducer extends QueueProducer {
  async publish(
    stream: string,
    payload: Record<string, string>,
  ): Promise<string> {
    const id = `${Date.now()}-0`;
    setImmediate(() => memoryBus.emit(stream, id, payload));
    return id;
  }
}
