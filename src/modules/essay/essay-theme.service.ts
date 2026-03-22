import { Injectable, NotFoundException } from '@nestjs/common';
import { EssayThemeRepository } from './essay-theme.repository';
import { CreateEssayThemeDto } from './dtos/create-essay-theme.dto';
import { UpdateEssayThemeDto } from './dtos/update-essay-theme.dto';
import { EssayTheme } from './entities/essay-theme.entity';

@Injectable()
export class EssayThemeService {
  constructor(private readonly themeRepo: EssayThemeRepository) {}

  async create(dto: CreateEssayThemeDto, userId: string): Promise<EssayTheme> {
    return this.themeRepo.create({
      ...dto,
      createdBy: userId,
    } as unknown as EssayTheme);
  }

  async findCurrent(): Promise<EssayTheme | null> {
    return this.themeRepo.findCurrentTheme();
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
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.themeRepo.softDelete(id);
  }
}
