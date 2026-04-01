import { Injectable, NotFoundException } from '@nestjs/common';
import { EssayThemeRepository } from './essay-theme.repository';
import { CreateEssayThemeDto } from './dtos/create-essay-theme.dto';
import { UpdateEssayThemeDto } from './dtos/update-essay-theme.dto';
import { EssayTheme } from './entities/essay-theme.entity';
import { CacheService } from '../../shared/modules/cache/cache.service';

@Injectable()
export class EssayThemeService {
  private readonly CURRENT_THEME_CACHE_KEY = 'essay:theme:current';

  constructor(
    private readonly themeRepo: EssayThemeRepository,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateEssayThemeDto, userId: string): Promise<EssayTheme> {
    const result = await this.themeRepo.create({
      ...dto,
      createdBy: userId,
    } as unknown as EssayTheme);
    await this.cache.del(this.CURRENT_THEME_CACHE_KEY);
    return result;
  }

  async findCurrent(): Promise<EssayTheme | null> {
    return this.cache.wrap(
      this.CURRENT_THEME_CACHE_KEY,
      () => this.themeRepo.findCurrentTheme(),
      60 * 60 * 1000, // 1h
    );
  }

  async findAvailable(userId: string): Promise<EssayTheme[]> {
    return this.themeRepo.findAvailableForUser(userId);
  }

  async findAll(page = 1, limit = 10) {
    return this.themeRepo.findAllBy({ page, limit });
  }

  async findById(id: string): Promise<EssayTheme> {
    const theme = await this.themeRepo.findOneBy({ id });
    if (!theme) throw new NotFoundException('Tema nao encontrado');
    return theme;
  }

  async update(id: string, dto: UpdateEssayThemeDto): Promise<void> {
    const theme = await this.findById(id);
    Object.assign(theme, dto);
    await this.themeRepo.update(theme);
    await this.cache.del(this.CURRENT_THEME_CACHE_KEY);
  }

  async remove(id: string): Promise<void> {
    const theme = await this.findById(id);
    theme.active = false;
    await this.themeRepo.update(theme);
    await this.cache.del(this.CURRENT_THEME_CACHE_KEY);
  }
}
