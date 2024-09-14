import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  StorageClass,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { BlobService } from './blob-service';

@Injectable()
export class S3Service implements BlobService {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async uploadFile(
    file: any,
    bucketName: string,
    exprires: Date,
  ): Promise<string> {
    const typeFile = file.originalname.split('.')[1];
    const fileKey = `${uuidv4()}.${typeFile}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      StorageClass: StorageClass.ONEZONE_IA,
      Expires: exprires,
    });
    await this.s3Client.send(command);
    return fileKey;
  }

  async getFile(fileKey: string, bucketName: string) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });
    const res = await this.s3Client.send(command);

    // O Body é um stream, precisamos convertê-lo para um Buffer
    const stream = res.Body as Readable;
    const chunks: any[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
