// src/cache/cache-config.module.ts
import { createKeyv, Keyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { EnvModule } from '../env/env.module';
import { EnvService } from '../env/env.service';
import { CacheDriver } from './cache-driver-enum';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [EnvModule],
      inject: [EnvService],
      useFactory: async (envService: EnvService) => {
        const driver = envService.get('CACHE_DRIVER');

        if (driver === CacheDriver.Redis) {
          const host = envService.get('REDIS_HOST');
          const port = envService.get('REDIS_PORT');
          return {
            stores: [
              createKeyv(`redis://${host}:${port}`, { namespace: 'vcnafacul' }),
            ],
          };
        }
        return {
          stores: [new Keyv()],
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheManagerModule {}
