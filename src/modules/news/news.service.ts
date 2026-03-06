import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { Status } from '../simulado/enum/status.enum';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { GetAllNewsDtoInput } from './dtos/get-all-news';
import { News } from './news.entity';
import { NewsRepository } from './news.repository';

const CACHE_MAX_AGE_DAYS = 7;
const CACHE_MAX_AGE_SECONDS = CACHE_MAX_AGE_DAYS * 24 * 60 * 60;

@Injectable()
export class NewsService extends BaseService<News> {
  constructor(
    private readonly repository: NewsRepository,
    private envService: EnvService,
    private readonly cache: CacheService,
    @Inject('BlobService') private readonly blobService: BlobService,
  ) {
    super(repository);
  }

  async create(
    request: CreateNewsDtoInput,
    file: Express.Multer.File,
    userId: string,
  ) {
    const fileKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_NEWS'),
    );
    if (!fileKey) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    const news = new News();
    news.session = request.session;
    news.title = request.title;
    news.fileName = fileKey;
    news.updatedBy = userId;

    return await this.repository.create(news);
  }

  async getFile(fileKey: string): Promise<{ buffer: string; contentType: string }> {
    return await this.blobService.getFile(
      fileKey,
      this.envService.get('BUCKET_NEWS'),
    );
  }

  getCacheControlHeader(): string {
    return `public, max-age=${CACHE_MAX_AGE_SECONDS}`;
  }

  override async delete(id: string): Promise<void> {
    const news = await this.repository.findOneBy({ id });
    if (news?.fileName) {
      try {
        await this.blobService.deleteFile(
          news.fileName,
          this.envService.get('BUCKET_NEWS'),
        );
      } catch {
        // ignora falha ao remover do S3; registro é removido mesmo assim
      }
    }
    await this.repository.delete(id);
  }

  async findActived() {
    const where = { actived: true };
    return await this.repository.findAllBy({ page: 1, limit: 0, where });
  }

  override async findAllBy(
    query: GetAllNewsDtoInput,
  ): Promise<GetAllOutput<News>> {
    return await this.repository.findAllBy({
      ...query,
      where: {
        actived: query.status.toString() === Status.Approved.toString(),
      },
    });
  }

  async getSummary() {
    return await this.cache.wrap<number>('news:total', async () =>
      this.repository.getTotalEntity(),
    );
  }
}
