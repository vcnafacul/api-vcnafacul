import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CreateHomeFeatureDto } from './dtos/create-home-feature.dto';
import { CreateHomeSupporterDto } from './dtos/create-home-supporter.dto';
import { ReorderItemsDto } from './dtos/reorder-items.dto';
import { UpdateHomeAboutDto } from './dtos/update-home-about.dto';
import { UpdateHomeFeatureSectionDto } from './dtos/update-home-feature-section.dto';
import { UpdateHomeFeatureDto } from './dtos/update-home-feature.dto';
import { UpdateHomeSupporterDto } from './dtos/update-home-supporter.dto';
import { HomeAbout } from './entities/home-about.entity';
import { HomeFeatureSection } from './entities/home-feature-section.entity';
import { HomeFeature } from './entities/home-feature.entity';
import { HomeSupporter } from './entities/home-supporter.entity';
import { HomeAboutRepository } from './repositories/home-about.repository';
import { HomeFeatureSectionRepository } from './repositories/home-feature-section.repository';
import { HomeFeatureRepository } from './repositories/home-feature.repository';
import { HomeSupporterRepository } from './repositories/home-supporter.repository';

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 365; // ~1 year

export const CACHE_KEYS = {
  about: 'home:about',
  featuresSection: 'home:features-section',
  features: 'home:features',
  supporters: 'home:supporters',
} as const;

const fileCacheKey = (fileKey: string) => `home:file:${fileKey}`;

@Injectable()
export class HomeContentService {
  constructor(
    private readonly aboutRepo: HomeAboutRepository,
    private readonly featureSectionRepo: HomeFeatureSectionRepository,
    private readonly featureRepo: HomeFeatureRepository,
    private readonly supporterRepo: HomeSupporterRepository,
    private readonly cache: CacheService,
    private readonly envService: EnvService,
    @Inject('BlobService') private readonly blobService: BlobService,
  ) {}

  async getAbout(): Promise<HomeAbout | null> {
    return this.cache.wrap<HomeAbout | null>(
      CACHE_KEYS.about,
      () => this.aboutRepo.findSingleton(),
      CACHE_TTL_MS,
    );
  }

  async getFile(
    fileKey: string,
  ): Promise<{ buffer: string; contentType: string }> {
    return this.cache.wrap<{ buffer: string; contentType: string }>(
      fileCacheKey(fileKey),
      () =>
        this.blobService.getFile(fileKey, this.envService.get('BUCKET_HOME')),
      CACHE_TTL_MS,
    );
  }

  private async invalidateFileCache(fileKey: string | null | undefined) {
    if (!fileKey) return;
    await this.cache.del(fileCacheKey(fileKey));
  }

  async getFeatureSection(): Promise<HomeFeatureSection | null> {
    return this.cache.wrap<HomeFeatureSection | null>(
      CACHE_KEYS.featuresSection,
      () => this.featureSectionRepo.findSingleton(),
      CACHE_TTL_MS,
    );
  }

  async upsertFeatureSection(
    dto: UpdateHomeFeatureSectionDto,
  ): Promise<HomeFeatureSection> {
    const existing =
      (await this.featureSectionRepo.findSingleton()) ??
      new HomeFeatureSection();
    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.description !== undefined) existing.description = dto.description;
    const saved = await this.featureSectionRepo.save(existing);
    await this.cache.del(CACHE_KEYS.featuresSection);
    return saved;
  }

  async upsertAbout(dto: UpdateHomeAboutDto): Promise<HomeAbout> {
    const existing = (await this.aboutRepo.findSingleton()) ?? new HomeAbout();
    if (dto.videoUrl !== undefined) existing.videoUrl = dto.videoUrl;
    if (dto.description !== undefined) existing.description = dto.description;
    const saved = await this.aboutRepo.save(existing);
    await this.cache.del(CACHE_KEYS.about);
    return saved;
  }

  async uploadAboutThumbnail(file: Express.Multer.File): Promise<HomeAbout> {
    if (!file) {
      throw new HttpException('Arquivo obrigatório', HttpStatus.BAD_REQUEST);
    }
    const existing = (await this.aboutRepo.findSingleton()) ?? new HomeAbout();
    const previousKey = existing.thumbnailUrl;
    const key = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_HOME'),
    );
    existing.thumbnailUrl = key;
    const saved = await this.aboutRepo.save(existing);
    if (previousKey) {
      try {
        await this.blobService.deleteFile(
          previousKey,
          this.envService.get('BUCKET_HOME'),
        );
      } catch {
        /* ignore */
      }
      await this.invalidateFileCache(previousKey);
    }
    await this.cache.del(CACHE_KEYS.about);
    return saved;
  }

  async getFeatures(): Promise<HomeFeature[]> {
    return this.cache.wrap<HomeFeature[]>(
      CACHE_KEYS.features,
      () => this.featureRepo.findAllOrdered(),
      CACHE_TTL_MS,
    );
  }

  async createFeature(dto: CreateHomeFeatureDto): Promise<HomeFeature> {
    const entity = new HomeFeature();
    entity.title = dto.title;
    entity.description = dto.description ?? null;
    entity.order = (await this.featureRepo.maxOrder()) + 1;
    const saved = await this.featureRepo.save(entity);
    await this.cache.del(CACHE_KEYS.features);
    return saved;
  }

  async updateFeature(
    id: number,
    dto: UpdateHomeFeatureDto,
  ): Promise<HomeFeature> {
    const entity = await this.featureRepo.findById(id);
    if (!entity) {
      throw new HttpException('Feature não encontrada', HttpStatus.NOT_FOUND);
    }
    if (dto.title !== undefined) entity.title = dto.title;
    if (dto.description !== undefined) entity.description = dto.description;
    const saved = await this.featureRepo.save(entity);
    await this.cache.del(CACHE_KEYS.features);
    return saved;
  }

  async deleteFeature(id: number): Promise<void> {
    const entity = await this.featureRepo.findById(id);
    if (!entity) return;
    if (entity.imageUrl) {
      try {
        await this.blobService.deleteFile(
          entity.imageUrl,
          this.envService.get('BUCKET_HOME'),
        );
      } catch {
        /* ignore */
      }
      await this.invalidateFileCache(entity.imageUrl);
    }
    await this.featureRepo.delete(id);
    await this.cache.del(CACHE_KEYS.features);
  }

  async reorderFeatures(dto: ReorderItemsDto): Promise<HomeFeature[]> {
    await this.featureRepo.applyOrders(dto.items);
    await this.cache.del(CACHE_KEYS.features);
    return this.featureRepo.findAllOrdered();
  }

  async uploadFeatureImage(
    id: number,
    file: Express.Multer.File,
  ): Promise<HomeFeature> {
    if (!file) {
      throw new HttpException('Arquivo obrigatório', HttpStatus.BAD_REQUEST);
    }
    const entity = await this.featureRepo.findById(id);
    if (!entity) {
      throw new HttpException('Feature não encontrada', HttpStatus.NOT_FOUND);
    }
    const previousKey = entity.imageUrl;
    entity.imageUrl = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_HOME'),
    );
    const saved = await this.featureRepo.save(entity);
    if (previousKey) {
      try {
        await this.blobService.deleteFile(
          previousKey,
          this.envService.get('BUCKET_HOME'),
        );
      } catch {
        /* ignore */
      }
      await this.invalidateFileCache(previousKey);
    }
    await this.cache.del(CACHE_KEYS.features);
    return saved;
  }

  async getSupporters(): Promise<HomeSupporter[]> {
    return this.cache.wrap<HomeSupporter[]>(
      CACHE_KEYS.supporters,
      () => this.supporterRepo.findAllOrdered(),
      CACHE_TTL_MS,
    );
  }

  async createSupporter(dto: CreateHomeSupporterDto): Promise<HomeSupporter> {
    const entity = new HomeSupporter();
    entity.name = dto.name;
    entity.link = dto.link;
    entity.description = dto.description ?? null;
    entity.order = (await this.supporterRepo.maxOrder()) + 1;
    const saved = await this.supporterRepo.save(entity);
    await this.cache.del(CACHE_KEYS.supporters);
    return saved;
  }

  async updateSupporter(
    id: number,
    dto: UpdateHomeSupporterDto,
  ): Promise<HomeSupporter> {
    const entity = await this.supporterRepo.findById(id);
    if (!entity) {
      throw new HttpException('Apoiador não encontrado', HttpStatus.NOT_FOUND);
    }
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.link !== undefined) entity.link = dto.link;
    if (dto.description !== undefined) {
      entity.description = dto.description;
    }
    const saved = await this.supporterRepo.save(entity);
    await this.cache.del(CACHE_KEYS.supporters);
    return saved;
  }

  async deleteSupporter(id: number): Promise<void> {
    const entity = await this.supporterRepo.findById(id);
    if (!entity) return;
    if (entity.logoUrl) {
      try {
        await this.blobService.deleteFile(
          entity.logoUrl,
          this.envService.get('BUCKET_HOME'),
        );
      } catch {
        /* ignore */
      }
      await this.invalidateFileCache(entity.logoUrl);
    }
    await this.supporterRepo.delete(id);
    await this.cache.del(CACHE_KEYS.supporters);
  }

  async reorderSupporters(dto: ReorderItemsDto): Promise<HomeSupporter[]> {
    await this.supporterRepo.applyOrders(dto.items);
    await this.cache.del(CACHE_KEYS.supporters);
    return this.supporterRepo.findAllOrdered();
  }

  async uploadSupporterLogo(
    id: number,
    file: Express.Multer.File,
  ): Promise<HomeSupporter> {
    if (!file) {
      throw new HttpException('Arquivo obrigatório', HttpStatus.BAD_REQUEST);
    }
    const entity = await this.supporterRepo.findById(id);
    if (!entity) {
      throw new HttpException('Apoiador não encontrado', HttpStatus.NOT_FOUND);
    }
    const previousKey = entity.logoUrl;
    entity.logoUrl = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_HOME'),
    );
    const saved = await this.supporterRepo.save(entity);
    if (previousKey) {
      try {
        await this.blobService.deleteFile(
          previousKey,
          this.envService.get('BUCKET_HOME'),
        );
      } catch {
        /* ignore */
      }
      await this.invalidateFileCache(previousKey);
    }
    await this.cache.del(CACHE_KEYS.supporters);
    return saved;
  }
}
