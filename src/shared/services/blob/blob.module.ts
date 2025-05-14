import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobService } from './blob-service';
import { S3Service } from './s3-service';
import { EnvService } from 'src/shared/modules/env/env.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: 'BlobService',
      useFactory: (envService: EnvService): BlobService => {
        const provider = envService.get('BLOB_PROVIDER');
        if (provider === 'S3') {
          return new S3Service(envService);
        }
        throw new Error('Invalid BLOB_PROVIDER');
      },
      inject: [ConfigService],
    },
  ],
  exports: ['BlobService'],
})
export class BlobModule {}
