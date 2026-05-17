import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { QueueDriver } from '../../enum/queue-driver.enum';
import { EnvModule } from '../env/env.module';
import { EnvService } from '../env/env.service';
import { InMemoryQueueConsumer } from './in-memory/in-memory-queue.consumer';
import { InMemoryQueueProducer } from './in-memory/in-memory-queue.producer';
import { QueueConsumer } from './queue.consumer';
import { QueueProducer } from './queue.producer';
import { ValkeyQueueConsumer } from './valkey/valkey-queue.consumer';
import { ValkeyQueueProducer } from './valkey/valkey-queue.producer';

@Global()
@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: 'QUEUE_REDIS_CLIENT',
      inject: [EnvService],
      useFactory: (env: EnvService) => {
        if (env.get('QUEUE_DRIVER') !== QueueDriver.Redis) return null;
        return new Redis({
          host: env.get('REDIS_HOST'),
          port: env.get('REDIS_PORT'),
          lazyConnect: true,
        });
      },
    },
    {
      provide: QueueProducer,
      inject: [EnvService, 'QUEUE_REDIS_CLIENT'],
      useFactory: (env: EnvService, redis: Redis | null) =>
        env.get('QUEUE_DRIVER') === QueueDriver.Redis
          ? new ValkeyQueueProducer(redis as Redis)
          : new InMemoryQueueProducer(),
    },
    {
      provide: QueueConsumer,
      inject: [EnvService, 'QUEUE_REDIS_CLIENT'],
      useFactory: (env: EnvService, redis: Redis | null) =>
        env.get('QUEUE_DRIVER') === QueueDriver.Redis
          ? new ValkeyQueueConsumer(redis as Redis)
          : new InMemoryQueueConsumer(),
    },
  ],
  exports: [QueueProducer, QueueConsumer],
})
export class QueueModule {}
