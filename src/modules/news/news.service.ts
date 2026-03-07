import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { Status } from '../simulado/enum/status.enum';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { GetAllNewsDtoInput } from './dtos/get-all-news';
import { UpdateNewsDtoInput } from './dtos/update-news.dto.input';
import { News } from './news.entity';
import { NewsRepository } from './news.repository';

const CACHE_MAX_AGE_DAYS = 7;
const CACHE_MAX_AGE_SECONDS = CACHE_MAX_AGE_DAYS * 24 * 60 * 60;

/** Hoje à meia-noite no fuso do servidor (para validação). */
function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Hoje no fuso do servidor no formato YYYY-MM-DD (para comparação em SQL). */
function todayLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parseia "YYYY-MM-DD" como meia-noite no fuso local do servidor.
 * Assim, ao persistir em coluna DATE, o dia salvo no banco corresponde ao dia selecionado no front.
 */
function parseExpireAt(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function validateExpireAtNotInPast(expireAt: Date | null): void {
  if (expireAt === null) return;
  const today = startOfTodayLocal();
  if (expireAt < today) {
    throw new HttpException(
      'A data de expiração não pode ser anterior a hoje',
      HttpStatus.BAD_REQUEST,
    );
  }
}

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
    const expireAt = parseExpireAt(request.expire_at);
    validateExpireAtNotInPast(expireAt);

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
    news.expireAt = expireAt ?? null;

    return await this.repository.create(news);
  }

  async update(id: string, request: UpdateNewsDtoInput, userId: string) {
    const news = await this.repository.findOneBy({ id });
    if (!news) {
      throw new HttpException('Novidade não encontrada', HttpStatus.NOT_FOUND);
    }
    if (request.expire_at !== undefined) {
      const expireAt = parseExpireAt(request.expire_at);
      validateExpireAtNotInPast(expireAt);
      news.expireAt = expireAt;
    }
    if (request.session !== undefined) news.session = request.session;
    if (request.title !== undefined) news.title = request.title;
    news.updatedBy = userId;
    await this.repository.update(news);
    return news;
  }

  async getFile(
    fileKey: string,
  ): Promise<{ buffer: string; contentType: string }> {
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

  async findActived(): Promise<{
    data: News[];
    page: number;
    limit: number;
    totalItems: number;
  }> {
    const todayStr = todayLocalDateString();
    const data = await this.repository.findActivedNotExpired(todayStr);
    return { data, page: 1, limit: 0, totalItems: data.length };
  }

  /** Chamado pelo cron à meia-noite: remove (soft delete + S3) novidades com expire_at < hoje. */
  async deleteExpired(): Promise<number> {
    const todayStr = todayLocalDateString();
    const expired = await this.repository.findExpiredBefore(todayStr);
    for (const n of expired) {
      await this.delete(n.id);
    }
    return expired.length;
  }

  /** Cron: todo dia à meia-noite (00:00) remove novidades expiradas. */
  @Cron('0 0 * * *')
  async handleExpiredNewsCron() {
    await this.deleteExpired();
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
