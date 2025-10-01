/* istanbul ignore file */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  StorageClass,
} from '@aws-sdk/client-s3';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { BlobService } from './blob-service';

@Injectable()
export class S3Service implements BlobService {
  private s3Client: S3Client;

  constructor(private envService: EnvService) {
    this.s3Client = new S3Client({
      endpoint: this.envService.get('AWS_ENDPOINT'),
      region: this.envService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.envService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.envService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }
  async deleteFile(fileKey: string, bucketName: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });
    await this.s3Client.send(command);
  }

  async uploadFile(
    file: any,
    bucketName: string,
    exprires?: Date,
    prefix?: string,
  ): Promise<string> {
    const typeFile = file.originalname.split('.').pop()?.toLowerCase();
    const sanitizedPrefix = prefix?.replace(/\/+$/, ''); // remove barras finais, se houver
    const fileKey = `${
      sanitizedPrefix ? `${sanitizedPrefix}/` : ''
    }${uuidv4()}.${typeFile}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      StorageClass: this.envService.get(
        'AWS_STORAGE_CLASS',
      ) as unknown as StorageClass,
      Expires: exprires,
    });
    await this.s3Client.send(command);
    return fileKey;
  }

  async getFile(
    fileKey: string,
    bucketName: string,
  ): Promise<{ buffer: string; contentType: string }> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    try {
      const res = await this.s3Client.send(command);

      if (!res.Body) {
        throw new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND);
      }

      const stream = res.Body as Readable;
      const chunks: any[] = [];
      const contentType = res.ContentType || 'application/octet-stream';

      const buffer = await new Promise<Buffer>((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

      return {
        buffer: buffer.toString('base64'),
        contentType,
      };
    } catch (error: any) {
      // Verifica se erro é do tipo 'NoSuchKey' (arquivo não encontrado no S3)
      const isNotFound =
        error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404;

      throw new HttpException(
        isNotFound ? 'Arquivo não encontrado' : 'Erro ao recuperar o arquivo',
        isNotFound ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
