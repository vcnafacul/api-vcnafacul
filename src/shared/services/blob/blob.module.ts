import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from './blob-service';
import { S3Service } from './s3-service';

@Module({
  imports: [EnvModule],
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
      inject: [EnvService],
    },
  ],
  exports: ['BlobService'],
})
export class BlobModule {}
