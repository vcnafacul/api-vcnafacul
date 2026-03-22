import { NotFoundException } from '@nestjs/common';
import { EssayThemeService } from './essay-theme.service';

describe('EssayThemeService', () => {
  let service: EssayThemeService;
  let themeRepo: any;

  const mockTheme = {
    id: 'theme-1',
    title: 'Tema de Redacao',
    motivationalText: 'Texto motivador',
    active: true,
    createdBy: 'admin-1',
  };

  beforeEach(() => {
    themeRepo = {
      create: jest.fn(),
      findCurrentTheme: jest.fn(),
      findAllBy: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new EssayThemeService(themeRepo);
  });

  describe('create', () => {
    it('should create a theme', async () => {
      themeRepo.create.mockResolvedValue(mockTheme);

      const result = await service.create(
        { title: 'Tema', motivationalText: 'Texto' } as any,
        'admin-1',
      );

      expect(themeRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockTheme);
    });
  });

  describe('findCurrent', () => {
    it('should return current theme', async () => {
      themeRepo.findCurrentTheme.mockResolvedValue(mockTheme);

      const result = await service.findCurrent();
      expect(result).toEqual(mockTheme);
    });

    it('should return null if no current theme', async () => {
      themeRepo.findCurrentTheme.mockResolvedValue(null);

      const result = await service.findCurrent();
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should delegate to repository', async () => {
      const expected = { data: [mockTheme], totalItems: 1 };
      themeRepo.findAllBy.mockResolvedValue(expected);

      const result = await service.findAll(1, 10);
      expect(result).toEqual(expected);
      expect(themeRepo.findAllBy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  describe('findById', () => {
    it('should return theme by id', async () => {
      themeRepo.findOneBy.mockResolvedValue(mockTheme);

      const result = await service.findById('theme-1');
      expect(result).toEqual(mockTheme);
    });

    it('should throw NotFoundException if not found', async () => {
      themeRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findById('theme-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a theme', async () => {
      themeRepo.findOneBy.mockResolvedValue({ ...mockTheme });
      themeRepo.update.mockResolvedValue(undefined);

      await service.update('theme-1', { title: 'Novo titulo' } as any);

      expect(themeRepo.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if theme not found', async () => {
      themeRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('theme-1', { title: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should deactivate a theme', async () => {
      themeRepo.findOneBy.mockResolvedValue({ ...mockTheme, active: true });
      themeRepo.update.mockResolvedValue(undefined);

      await service.remove('theme-1');

      expect(themeRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'theme-1', active: false }),
      );
    });

    it('should throw NotFoundException if theme not found', async () => {
      themeRepo.findOneBy.mockResolvedValue(null);

      await expect(service.remove('theme-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
