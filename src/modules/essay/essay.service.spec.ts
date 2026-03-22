import { ConflictException, NotFoundException } from '@nestjs/common';
import { EssayService } from './essay.service';
import { EssayStatus } from './enums/essay-status.enum';
import { EssayInputType } from './enums/essay-input-type.enum';

describe('EssayService', () => {
  let service: EssayService;
  let essayRepo: any;
  let themeService: any;
  let aiProvider: any;
  let envService: any;
  let settingsService: any;

  const mockTheme = { id: 'theme-1', title: 'Tema', motivationalText: 'Texto' };
  const mockEssay = {
    id: 'essay-1',
    userId: 'user-1',
    themeId: 'theme-1',
    title: 'Titulo',
    text: 'Texto da redacao',
    status: EssayStatus.DRAFT,
    inputType: EssayInputType.TYPED,
  };

  beforeEach(() => {
    essayRepo = {
      findByUserAndTheme: jest.fn(),
      create: jest.fn(),
      findEssayById: jest.fn(),
      update: jest.fn(),
      findByUser: jest.fn(),
      createAIReview: jest.fn(),
      saveAIReview: jest.fn(),
    };
    themeService = {
      findById: jest.fn().mockResolvedValue(mockTheme),
    };
    aiProvider = {
      correctEssay: jest.fn(),
    };
    envService = {
      get: jest.fn().mockReturnValue(false),
    };
    settingsService = {
      isAIEnabled: jest.fn().mockResolvedValue(false),
      getSettings: jest.fn().mockResolvedValue({ aiEnabled: false }),
      updateSettings: jest.fn(),
    };

    service = new EssayService(essayRepo, themeService, aiProvider, envService, settingsService);
  });

  describe('create', () => {
    it('should create an essay', async () => {
      essayRepo.findByUserAndTheme.mockResolvedValue(null);
      essayRepo.create.mockResolvedValue(mockEssay);

      const result = await service.create(
        { themeId: 'theme-1', title: 'Titulo', text: 'Texto' },
        'user-1',
      );

      expect(themeService.findById).toHaveBeenCalledWith('theme-1');
      expect(essayRepo.findByUserAndTheme).toHaveBeenCalledWith('user-1', 'theme-1');
      expect(result).toEqual(mockEssay);
    });

    it('should throw ConflictException if essay already exists for theme', async () => {
      essayRepo.findByUserAndTheme.mockResolvedValue(mockEssay);

      await expect(
        service.create({ themeId: 'theme-1', title: 'T', text: 'X' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateDraft', () => {
    it('should update a draft essay', async () => {
      essayRepo.findEssayById.mockResolvedValue({ ...mockEssay });
      essayRepo.update.mockResolvedValue(undefined);

      await service.updateDraft('essay-1', { title: 'Novo titulo' }, 'user-1');

      expect(essayRepo.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if essay not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);

      await expect(
        service.updateDraft('essay-1', { title: 'X' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user does not own the essay', async () => {
      essayRepo.findEssayById.mockResolvedValue({ ...mockEssay, userId: 'other' });

      await expect(
        service.updateDraft('essay-1', { title: 'X' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if essay is already submitted', async () => {
      essayRepo.findEssayById.mockResolvedValue({
        ...mockEssay,
        status: EssayStatus.SUBMITTED,
      });

      await expect(
        service.updateDraft('essay-1', { title: 'X' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('submit', () => {
    it('should submit a draft essay', async () => {
      const essay = { ...mockEssay };
      essayRepo.findEssayById.mockResolvedValue(essay);
      essayRepo.update.mockResolvedValue(undefined);

      const result = await service.submit(
        'essay-1',
        { title: 'Titulo Final', text: 'Texto final da redacao' },
        'user-1',
      );

      expect(result.status).toBe(EssayStatus.SUBMITTED);
      expect(result.wordCount).toBe(4);
      expect(result.submittedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if essay not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);

      await expect(
        service.submit('essay-1', { title: 'T', text: 'X' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already submitted', async () => {
      essayRepo.findEssayById.mockResolvedValue({
        ...mockEssay,
        status: EssayStatus.SUBMITTED,
      });

      await expect(
        service.submit('essay-1', { title: 'T', text: 'X' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return the essay', async () => {
      essayRepo.findEssayById.mockResolvedValue(mockEssay);

      const result = await service.findById('essay-1');
      expect(result).toEqual(mockEssay);
    });

    it('should throw NotFoundException if not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);

      await expect(service.findById('essay-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if userId does not match', async () => {
      essayRepo.findEssayById.mockResolvedValue({ ...mockEssay, userId: 'other' });

      await expect(service.findById('essay-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMyEssays', () => {
    it('should delegate to repository', async () => {
      const expected = { data: [mockEssay], total: 1 };
      essayRepo.findByUser.mockResolvedValue(expected);

      const result = await service.findMyEssays('user-1', 1, 10);
      expect(result).toEqual(expected);
      expect(essayRepo.findByUser).toHaveBeenCalledWith('user-1', 1, 10);
    });
  });
});
