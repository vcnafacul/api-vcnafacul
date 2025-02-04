import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from './blob-service';
import { S3Service } from './s3-service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: 'BlobService',
      useFactory: (env: EnvService): BlobService => {
        const provider = env.get('BLOB_PROVIDER');
        if (provider === 'S3') {
          return new S3Service(env);
        }
        throw new Error('Invalid BLOB_PROVIDER');
      },
      inject: [ConfigService],
    },
  ],
  exports: ['BlobService'],
})
export class BlobModule {}
