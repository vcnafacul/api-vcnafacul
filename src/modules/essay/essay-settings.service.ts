import { Injectable } from '@nestjs/common';
import { EssaySettingsRepository } from './essay-settings.repository';

@Injectable()
export class EssaySettingsService {
  constructor(private readonly settingsRepo: EssaySettingsRepository) {}

  async getSettings(): Promise<{ aiEnabled: boolean }> {
    const settings = await this.settingsRepo.getSettings();
    return { aiEnabled: settings.aiEnabled };
  }

  async updateSettings(data: { aiEnabled: boolean }): Promise<{ aiEnabled: boolean }> {
    const settings = await this.settingsRepo.updateSettings(data);
    return { aiEnabled: settings.aiEnabled };
  }

  async isAIEnabled(): Promise<boolean> {
    const settings = await this.settingsRepo.getSettings();
    return settings.aiEnabled;
  }
}
