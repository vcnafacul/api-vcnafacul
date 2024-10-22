import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobService } from './blob-service';
import { S3Service } from './s3-service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: 'BlobService',
      useFactory: (configService: ConfigService): BlobService => {
        const provider = configService.get<string>('BLOB_PROVIDER');
        if (provider === 'S3') {
          return new S3Service(configService);
        }
        throw new Error('Invalid BLOB_PROVIDER');
      },
      inject: [ConfigService],
    },
  ],
  exports: ['BlobService'],
})
export class BlobModule {}
