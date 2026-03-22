import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EssaySettings } from './entities/essay-settings.entity';

@Injectable()
export class EssaySettingsRepository {
  constructor(
    @InjectRepository(EssaySettings)
    private readonly repo: Repository<EssaySettings>,
  ) {}

  async getSettings(): Promise<EssaySettings> {
    let settings = await this.repo.findOne({ where: { id: 'default' } });
    if (!settings) {
      settings = this.repo.create({ id: 'default', aiEnabled: true });
      await this.repo.save(settings);
    }
    return settings;
  }

  async updateSettings(
    partial: Partial<Pick<EssaySettings, 'aiEnabled'>>,
  ): Promise<EssaySettings> {
    const settings = await this.getSettings();
    Object.assign(settings, partial);
    return this.repo.save(settings);
  }
}
