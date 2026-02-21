import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { cleanString } from 'src/utils/cleanString';

@Injectable()
export class ContentProxyService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly cache: CacheService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async create(body: any, userId: string) {
    const { subjectId, ...rest } = body;
    return await this.axios.post('v1/content', {
      ...rest,
      subject: subjectId,
      userId,
    });
  }

  async getAll(query: Record<string, any>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    return await this.axios.get(`v1/content?${params.toString()}`);
  }

  async getById(id: string) {
    return await this.axios.get(`v1/content/${id}`);
  }

  async getBySubject(subjectId: string, status?: number) {
    let url = `v1/content/subject/${subjectId}`;
    if (status !== undefined) url += `?status=${status}`;
    return await this.axios.get(url);
  }

  async getDemands(page: number, limit: number) {
    return await this.axios.get(
      `v1/content/demand?page=${page}&limit=${limit}`,
    );
  }

  async changeStatus(id: string, status: number, userId: string) {
    const result = await this.axios.patch(`v1/content/${id}/status`, {
      status,
      userId,
    });
    await this.invalidateContentCaches(id);
    return result;
  }

  private async invalidateContentCaches(contentId: string) {
    try {
      const content = await this.axios.get<any>(
        `v1/content/${contentId}/populated`,
      );
      const materiaId =
        content?.subject?.frente?.materia?._id ||
        content?.subject?.frente?.materia;
      if (materiaId) {
        await this.cache.del(`frente:materiawithcontent:${materiaId}`);
      }
    } catch {
      // ignore cache invalidation errors
    }
    await this.cache.del('content:summary');
    await this.cache.del('content:stats-by-frente');
  }

  async reset(id: string, userId: string) {
    const result = await this.axios.patch(`v1/content/${id}/reset`, {
      userId,
    });
    await this.invalidateContentCaches(id);
    return result;
  }

  async uploadFile(id: string, userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('file not found', HttpStatus.BAD_REQUEST);
    }

    const content = await this.axios.get<any>(`v1/content/${id}/populated`);
    if (!content) {
      throw new HttpException('demand not found', HttpStatus.NOT_FOUND);
    }

    const directory = this.getDirectory(content);
    const fileKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_CONTENT'),
      undefined,
      directory,
    );

    if (!fileKey) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }

    await this.axios.post('v1/file-content', {
      fileKey,
      originalName: file.originalname,
      content: id,
      uploadedBy: userId,
    });

    return { fileKey };
  }

  private getDirectory(content: any): string {
    const title = cleanString(content.title);
    const subjectName = cleanString(content.subject?.name || '');
    const frenteName = cleanString(content.subject?.frente?.nome || '');
    const materiaName = cleanString(
      content.subject?.frente?.materia?.nome || '',
    );
    return `${materiaName}/${frenteName}/${subjectName}/${title}`;
  }

  async getFile(fileContentId: string) {
    const fileContent = await this.axios.get<any>(
      `v1/file-content/${fileContentId}`,
    );
    if (!fileContent) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
    return await this.blobService.getFile(
      fileContent.fileKey,
      this.envService.get('BUCKET_CONTENT'),
    );
  }

  async delete(id: string) {
    const fileContents = await this.axios.get<any[]>(
      `v1/file-content/content/${id}`,
    );

    if (fileContents && Array.isArray(fileContents)) {
      for (const fc of fileContents) {
        await this.blobService.deleteFile(
          fc.fileKey,
          this.envService.get('BUCKET_CONTENT'),
        );
        await this.axios.delete(`v1/file-content/${fc._id}`);
      }
    }

    return await this.axios.delete(`v1/content/${id}`);
  }

  async changeOrder(body: any) {
    const { node1, node2 } = body;
    if (node1 && node2) {
      return await this.axios.patch('v1/content/swap-order', {
        id1: node1,
        id2: node2,
      });
    }
    return await this.axios.patch('v1/content/swap-order', body);
  }

  async getSummary() {
    return this.cache.wrap<object>(
      'content:summary',
      async () => await this.axios.get<any>('v1/content/summary'),
    );
  }

  async getStatsByFrente() {
    return this.cache.wrap<object>(
      'content:stats-by-frente',
      async () => await this.axios.get<any>('v1/content/stats-by-frente'),
    );
  }

  async getSnapshotContentStatus() {
    return this.cache.wrap<object>(
      'content:snapshot-content-status',
      async () =>
        await this.axios.get<any>('v1/content/snapshot-content-status'),
    );
  }
}
