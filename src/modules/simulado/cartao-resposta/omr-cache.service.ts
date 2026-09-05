import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { EnvService } from 'src/shared/modules/env/env.service';

const PREFIX = 'omr:img:';
const TTL_SECONDS = 180;

@Injectable()
export class OmrCacheService {
  private readonly logger = new Logger(OmrCacheService.name);
  private readonly redis: Redis;

  constructor(env: EnvService) {
    this.redis = new Redis({
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async primeImagem(imageKey: string, buffer: Buffer): Promise<void> {
    try {
      await this.redis.set(`${PREFIX}${imageKey}`, buffer, 'EX', TTL_SECONDS);
    } catch (err) {
      this.logger.warn(
        `prime do cache falhou para ${imageKey}; seguindo sem cache: ${err}`,
      );
    }
  }
}
