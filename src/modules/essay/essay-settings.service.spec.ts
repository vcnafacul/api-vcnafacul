import { EssaySettingsService } from './essay-settings.service';

describe('EssaySettingsService', () => {
  let service: EssaySettingsService;
  let settingsRepo: any;

  beforeEach(() => {
    settingsRepo = {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    };
    service = new EssaySettingsService(settingsRepo);
  });

  describe('getSettings', () => {
    it('should return aiEnabled from repository', async () => {
      settingsRepo.getSettings.mockResolvedValue({ aiEnabled: true });
      const result = await service.getSettings();
      expect(result).toEqual({ aiEnabled: true });
      expect(settingsRepo.getSettings).toHaveBeenCalled();
    });

    it('should return aiEnabled false', async () => {
      settingsRepo.getSettings.mockResolvedValue({ aiEnabled: false });
      const result = await service.getSettings();
      expect(result).toEqual({ aiEnabled: false });
    });
  });

  describe('updateSettings', () => {
    it('should update and return settings', async () => {
      settingsRepo.updateSettings.mockResolvedValue({ aiEnabled: false });
      const result = await service.updateSettings({ aiEnabled: false });
      expect(result).toEqual({ aiEnabled: false });
      expect(settingsRepo.updateSettings).toHaveBeenCalledWith({
        aiEnabled: false,
      });
    });
  });

  describe('isAIEnabled', () => {
    it('should return true when AI is enabled', async () => {
      settingsRepo.getSettings.mockResolvedValue({ aiEnabled: true });
      const result = await service.isAIEnabled();
      expect(result).toBe(true);
    });

    it('should return false when AI is disabled', async () => {
      settingsRepo.getSettings.mockResolvedValue({ aiEnabled: false });
      const result = await service.isAIEnabled();
      expect(result).toBe(false);
    });
  });
});
