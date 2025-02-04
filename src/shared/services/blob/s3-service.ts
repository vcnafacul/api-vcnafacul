import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  StorageClass,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { BlobService } from './blob-service';

@Injectable()
export class S3Service implements BlobService {
  private s3Client: S3Client;

  constructor(private readonly env: EnvService) {
    this.s3Client = new S3Client({
      endpoint: this.env.get('AWS_ENDPOINT'),
      region: this.env.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.env.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.env.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(
    file: any,
    bucketName: string,
    exprires?: Date,
  ): Promise<string> {
    const typeFile = file.originalname.split('.')[1];
    const fileKey = `${uuidv4()}.${typeFile}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      StorageClass: this.env.get('AWS_STORAGE_CLASS') as StorageClass,
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

    const stream = res.Body as Readable;
    const chunks: any[] = [];

    // Verifique o tipo MIME nos metadados do arquivo (caso disponível)
    const contentType = res.ContentType || 'application/octet-stream';

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });

    return {
      buffer,
      contentType, // Inclua o tipo MIME
    };
  }
}
