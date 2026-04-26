import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
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
import { parseAssetIds } from './utils/parse-asset-ids';

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

function validateXorContent(opts: {
  contentType: 'file' | 'text';
  hasFile: boolean;
  body: string | null | undefined;
}): void {
  const { contentType, hasFile, body } = opts;
  const hasBody = !!body && body.trim().length > 0;
  if (contentType === 'text') {
    if (!hasBody) {
      throw new HttpException(
        'body é obrigatório quando contentType=text',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (hasFile) {
      throw new HttpException(
        'envie file OU body, não ambos',
        HttpStatus.BAD_REQUEST,
      );
    }
  } else {
    if (!hasFile) {
      throw new HttpException(
        'file é obrigatório quando contentType=file',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (hasBody) {
      throw new HttpException(
        'envie file OU body, não ambos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

@Injectable()
export class NewsService extends BaseService<News> {
  constructor(
    private readonly repository: NewsRepository,
    private envService: EnvService,
    private readonly cache: CacheService,
    @Inject('BlobService') private readonly blobService: BlobService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {
    super(repository);
  }

  async create(
    request: CreateNewsDtoInput,
    file: Express.Multer.File | undefined,
    userId: string,
  ) {
    const expireAt = parseExpireAt(request.expire_at);
    validateExpireAtNotInPast(expireAt);

    const contentType: 'file' | 'text' = request.contentType ?? 'file';
    validateXorContent({
      contentType,
      hasFile: !!file,
      body: request.body,
    });

    let fileKey: string | null = null;
    if (contentType === 'file') {
      fileKey = await this.blobService.uploadFile(
        file as Express.Multer.File,
        this.envService.get('BUCKET_NEWS'),
      );
      if (!fileKey) {
        throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
      }
    }

    return await this.entityManager.transaction(async (manager) => {
      if (request.destaque === true) {
        await this.repository.unsetAllDestaqueExcept(null, manager);
      }

      const news = manager.create(News, {
        title: request.title,
        description: request.description ?? null,
        fileName: fileKey,
        body: contentType === 'text' ? (request.body as string) : null,
        contentType,
        updatedBy: userId,
        destaque: request.destaque === true,
        expireAt: expireAt ?? null,
      });

      return await manager.save(News, news);
    });
  }

  async update(
    id: string,
    request: UpdateNewsDtoInput & { contentType?: unknown },
    userId: string,
  ) {
    if ('contentType' in request && request.contentType !== undefined) {
      throw new HttpException(
        'contentType não pode ser alterado',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.entityManager.transaction(async (manager) => {
      const news = await manager.findOne(News, { where: { id } });
      if (!news) {
        throw new HttpException(
          'Novidade não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      if (request.body !== undefined && news.contentType !== 'text') {
        throw new HttpException(
          'body só pode ser atualizado em novidades tipo text',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (request.expire_at !== undefined) {
        const expireAt = parseExpireAt(request.expire_at);
        validateExpireAtNotInPast(expireAt);
        news.expireAt = expireAt;
      }
      if (request.title !== undefined) news.title = request.title;
      if (request.description !== undefined) {
        news.description = request.description || null;
      }

      if (request.body !== undefined) {
        const oldIds = parseAssetIds(news.body);
        const newIds = parseAssetIds(request.body);
        const removed = oldIds.filter((aid) => !newIds.includes(aid));
        for (const assetId of removed) {
          try {
            await this.blobService.deleteFile(
              assetId,
              this.envService.get('BUCKET_NEWS'),
            );
          } catch {
            // best-effort
          }
        }
        news.body = request.body;
      }

      if (request.destaque === true) {
        await this.repository.unsetAllDestaqueExcept(id, manager);
        news.destaque = true;
      } else if (request.destaque === false) {
        news.destaque = false;
      }
      news.updatedBy = userId;

      await manager.save(News, news);
      return news;
    });
  }

  async uploadAsset(file: Express.Multer.File): Promise<{ assetId: string }> {
    const fileKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_NEWS'),
    );
    if (!fileKey) {
      throw new HttpException(
        'Erro ao fazer upload do asset',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { assetId: fileKey };
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
    if (!news) {
      await this.repository.delete(id);
      return;
    }

    if (news.contentType === 'text' && news.body) {
      const assetIds = parseAssetIds(news.body);
      for (const assetId of assetIds) {
        try {
          await this.blobService.deleteFile(
            assetId,
            this.envService.get('BUCKET_NEWS'),
          );
        } catch {
          // best-effort
        }
      }
    } else if (news.fileName) {
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
