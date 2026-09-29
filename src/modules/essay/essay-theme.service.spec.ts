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

  let mockCacheService: any;
  let blobService: any;
  const envService = { get: jest.fn().mockReturnValue('bucket-essay') };

  beforeEach(() => {
    themeRepo = {
      create: jest.fn(),
      findCurrentTheme: jest.fn(),
      findAllBy: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    mockCacheService = {
      wrap: jest.fn().mockImplementation((_key, fn) => fn()),
      del: jest.fn().mockResolvedValue(undefined),
    };
    blobService = {
      uploadFile: jest.fn(),
      getFile: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    service = new EssayThemeService(
      themeRepo,
      mockCacheService,
      blobService,
      envService as any,
    );
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

  describe('imagens do texto motivador', () => {
    const png = (over = {}) =>
      ({
        mimetype: 'image/png',
        size: 1000,
        originalname: 'minha foto (1).PNG',
        ...over,
      }) as any;

    it('upload: grava sob o prefixo dos temas e devolve só o id', async () => {
      blobService.uploadFile.mockResolvedValue('essay-themes/abc-123.png');

      const r = await service.uploadAsset(png());

      expect(r).toEqual({ assetId: 'abc-123.png' });
      const [file, bucket, , prefixo] = blobService.uploadFile.mock.calls[0];
      expect(bucket).toBe('bucket-essay');
      expect(prefixo).toBe('essay-themes');
      // extensão pelo tipo, não pelo nome enviado
      expect(file.originalname).toBe('imagem.png');
    });

    it('upload: recusa o que não é imagem e o que passa de 5MB', async () => {
      await expect(
        service.uploadAsset(png({ mimetype: 'application/pdf' })),
      ).rejects.toThrow('Formato não aceito');
      await expect(
        service.uploadAsset(png({ size: 6 * 1024 * 1024 })),
      ).rejects.toThrow('5MB');
      expect(blobService.uploadFile).not.toHaveBeenCalled();
    });

    it('⚠️ leitura: só alcança chaves sob o prefixo dos temas', async () => {
      blobService.getFile.mockResolvedValue({
        buffer: Buffer.from('x').toString('base64'),
        contentType: 'image/png',
      });

      await service.getAsset('abc-123.png');
      expect(blobService.getFile).toHaveBeenCalledWith(
        'essay-themes/abc-123.png',
        'bucket-essay',
      );

      for (const id of ['../redacao.png', 'a/b.png', 'semextensao']) {
        await expect(service.getAsset(id)).rejects.toThrow(NotFoundException);
      }
      expect(blobService.getFile).toHaveBeenCalledTimes(1);
    });

    it('update: apaga só as imagens que saíram do texto, depois de salvar', async () => {
      themeRepo.findOneBy.mockResolvedValue({
        ...mockTheme,
        motivationalText: '![](asset://a.png) e ![](asset://b.png)',
      });

      await service.update('theme-1', {
        motivationalText: 'só ![](asset://b.png)',
      } as any);

      expect(blobService.deleteFile).toHaveBeenCalledTimes(1);
      expect(blobService.deleteFile).toHaveBeenCalledWith(
        'essay-themes/a.png',
        'bucket-essay',
      );
      expect(themeRepo.update.mock.invocationCallOrder[0]).toBeLessThan(
        blobService.deleteFile.mock.invocationCallOrder[0],
      );
    });

    it('update sem mexer no texto não apaga nada', async () => {
      themeRepo.findOneBy.mockResolvedValue({
        ...mockTheme,
        motivationalText: '![](asset://a.png)',
      });
      await service.update('theme-1', { title: 'Novo' } as any);
      expect(blobService.deleteFile).not.toHaveBeenCalled();
    });

    it('para a IA: marcadores no texto e imagens na ordem; a que falha fica de fora', async () => {
      blobService.getFile.mockImplementation(async (key: string) => {
        if (key.endsWith('b.png')) throw new Error('sumiu');
        return { buffer: 'QUJD', contentType: 'image/png' };
      });

      const r = await service.textoMotivadorComImagens(
        'Veja ![g](asset://a.png), ![](asset://b.png) e de novo ![](asset://a.png)',
      );

      expect(r.texto).toBe('Veja [Imagem 1], [Imagem 2] e de novo [Imagem 1]');
      expect(r.imagens).toEqual([
        { rotulo: 'Imagem 1', mediaType: 'image/png', base64: 'QUJD' },
      ]);
    });
  });
});
