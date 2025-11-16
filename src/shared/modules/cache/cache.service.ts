import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject('CACHE_MANAGER') private readonly cacheManager: Cache) {}

  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 60 * 60 * 24 * 1000,
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== undefined) return cached;

    const result = await fn();
    await this.cacheManager.set(key, result, ttl);
    return result;
  }

  async del(key: string) {
    await this.cacheManager.del(key);
  }

  async set(key: string, value: any, ttl: number = 60 * 60 * 24 * 1000) {
    await this.cacheManager.set(key, value, ttl);
  }
}
