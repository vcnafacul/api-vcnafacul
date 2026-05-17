import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class QueueProducer {
  abstract publish(
    stream: string,
    payload: Record<string, string>,
  ): Promise<string>;
}
