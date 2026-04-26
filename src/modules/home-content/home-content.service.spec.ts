import { HttpException } from '@nestjs/common';
import { HomeAbout } from './entities/home-about.entity';
import { HomeFeatureSection } from './entities/home-feature-section.entity';
import { HomeFeature } from './entities/home-feature.entity';
import { HomeSupporter } from './entities/home-supporter.entity';
import { CACHE_KEYS, HomeContentService } from './home-content.service';

describe('HomeContentService', () => {
  let service: HomeContentService;
  let aboutRepo: any;
  let featureSectionRepo: any;
  let featureRepo: any;
  let supporterRepo: any;
  let cache: any;
  let envService: any;
  let blobService: any;

  const BUCKET = 'home-bucket';
  const fakeFile = { originalname: 'x.png' } as Express.Multer.File;

  beforeEach(() => {
    aboutRepo = {
      findSingleton: jest.fn(),
      save: jest.fn(async (e) => e),
    };
    featureSectionRepo = {
      findSingleton: jest.fn(),
      save: jest.fn(async (e) => e),
    };
    featureRepo = {
      findAllOrdered: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (e) => e),
      delete: jest.fn(),
      maxOrder: jest.fn(),
      applyOrders: jest.fn(),
    };
    supporterRepo = {
      findAllOrdered: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (e) => e),
      delete: jest.fn(),
      maxOrder: jest.fn(),
      applyOrders: jest.fn(),
    };
    cache = {
      wrap: jest.fn(async (_key: string, fn: () => any) => fn()),
      del: jest.fn().mockResolvedValue(undefined),
    };
    envService = { get: jest.fn().mockReturnValue(BUCKET) };
    blobService = {
      uploadFile: jest.fn().mockResolvedValue('new-key'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getFile: jest
        .fn()
        .mockResolvedValue({ buffer: 'b64', contentType: 'image/png' }),
    };

    service = new HomeContentService(
      aboutRepo,
      featureSectionRepo,
      featureRepo,
      supporterRepo,
      cache,
      envService,
      blobService,
    );
  });

  describe('getAbout', () => {
    it('wraps the repository call with the about cache key', async () => {
      const about = { id: 1 } as HomeAbout;
      aboutRepo.findSingleton.mockResolvedValue(about);

      const result = await service.getAbout();

      expect(result).toBe(about);
      expect(cache.wrap).toHaveBeenCalledWith(
        CACHE_KEYS.about,
        expect.any(Function),
        expect.any(Number),
      );
      expect(aboutRepo.findSingleton).toHaveBeenCalled();
    });
  });

  describe('getFile', () => {
    it('delegates to blobService via cache', async () => {
      const res = await service.getFile('abc');
      expect(res).toEqual({ buffer: 'b64', contentType: 'image/png' });
      expect(blobService.getFile).toHaveBeenCalledWith('abc', BUCKET);
      expect(cache.wrap).toHaveBeenCalled();
    });
  });

  describe('getFeatureSection', () => {
    it('wraps the repository call with the feature-section cache key', async () => {
      featureSectionRepo.findSingleton.mockResolvedValue(null);

      const result = await service.getFeatureSection();

      expect(result).toBeNull();
      expect(cache.wrap.mock.calls[0][0]).toBe(CACHE_KEYS.featuresSection);
    });
  });

  describe('upsertFeatureSection', () => {
    it('updates existing section and invalidates cache', async () => {
      const existing = new HomeFeatureSection();
      existing.title = 'old';
      existing.description = 'old desc';
      featureSectionRepo.findSingleton.mockResolvedValue(existing);

      const saved = await service.upsertFeatureSection({
        title: 'new',
        description: 'new desc',
      });

      expect(saved.title).toBe('new');
      expect(saved.description).toBe('new desc');
      expect(featureSectionRepo.save).toHaveBeenCalled();
      expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.featuresSection);
    });

    it('creates a new section when none exists and ignores undefined fields', async () => {
      featureSectionRepo.findSingleton.mockResolvedValue(null);

      const saved = await service.upsertFeatureSection({});

      expect(saved).toBeInstanceOf(HomeFeatureSection);
      expect(featureSectionRepo.save).toHaveBeenCalled();
    });
  });

  describe('upsertAbout', () => {
    it('updates fields and invalidates cache', async () => {
      const existing = new HomeAbout();
      existing.videoUrl = 'old';
      existing.description = 'old';
      aboutRepo.findSingleton.mockResolvedValue(existing);

      const saved = await service.upsertAbout({
        videoUrl: 'new',
        description: 'new desc',
      });

      expect(saved.videoUrl).toBe('new');
      expect(saved.description).toBe('new desc');
      expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.about);
    });

    it('creates a new about row when none exists', async () => {
      aboutRepo.findSingleton.mockResolvedValue(null);

      const saved = await service.upsertAbout({ videoUrl: 'v' });

      expect(saved).toBeInstanceOf(HomeAbout);
      expect(aboutRepo.save).toHaveBeenCalled();
    });
  });

  describe('uploadAboutThumbnail', () => {
    it('throws when no file is provided', async () => {
      await expect(
        service.uploadAboutThumbnail(undefined as any),
      ).rejects.toThrow(HttpException);
    });

    it('uploads, saves, deletes previous and invalidates caches', async () => {
      const existing = new HomeAbout();
      existing.thumbnailUrl = 'old-key';
      aboutRepo.findSingleton.mockResolvedValue(existing);

      const saved = await service.uploadAboutThumbnail(fakeFile);

      expect(blobService.uploadFile).toHaveBeenCalledWith(fakeFile, BUCKET);
      expect(saved.thumbnailUrl).toBe('new-key');
      expect(blobService.deleteFile).toHaveBeenCalledWith('old-key', BUCKET);
      expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.about);
      expect(cache.del).toHaveBeenCalledWith('home:file:old-key');
    });

    it('creates a new about row when none exists and skips previous-key cleanup', async () => {
      aboutRepo.findSingleton.mockResolvedValue(null);

      const saved = await service.uploadAboutThumbnail(fakeFile);

      expect(saved).toBeInstanceOf(HomeAbout);
      expect(blobService.deleteFile).not.toHaveBeenCalled();
    });

    it('swallows errors from blobService.deleteFile', async () => {
      const existing = new HomeAbout();
      existing.thumbnailUrl = 'old-key';
      aboutRepo.findSingleton.mockResolvedValue(existing);
      blobService.deleteFile.mockRejectedValueOnce(new Error('boom'));

      await expect(
        service.uploadAboutThumbnail(fakeFile),
      ).resolves.toBeDefined();
    });
  });

  describe('features', () => {
    const feature = (id = 1): HomeFeature => {
      const f = new HomeFeature();
      f.id = id;
      f.title = 't';
      f.description = 'd';
      f.imageUrl = null;
      f.order = 0;
      return f;
    };

    describe('getFeatures', () => {
      it('wraps repo via cache', async () => {
        featureRepo.findAllOrdered.mockResolvedValue([feature()]);

        const result = await service.getFeatures();
        expect(result).toHaveLength(1);
        expect(cache.wrap.mock.calls[0][0]).toBe(CACHE_KEYS.features);
      });
    });

    describe('createFeature', () => {
      it('places the new feature at the end and invalidates cache', async () => {
        featureRepo.maxOrder.mockResolvedValue(4);

        const saved = await service.createFeature({
          title: 'novo',
          description: 'desc',
        });

        expect(saved.order).toBe(5);
        expect(saved.title).toBe('novo');
        expect(saved.description).toBe('desc');
        expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.features);
      });

      it('defaults description to null when omitted', async () => {
        featureRepo.maxOrder.mockResolvedValue(0);

        const saved = await service.createFeature({ title: 'novo' } as any);

        expect(saved.description).toBeNull();
      });
    });

    describe('updateFeature', () => {
      it('throws NOT_FOUND when feature does not exist', async () => {
        featureRepo.findById.mockResolvedValue(null);

        await expect(service.updateFeature(1, { title: 'x' })).rejects.toThrow(
          HttpException,
        );
      });

      it('patches only provided fields', async () => {
        featureRepo.findById.mockResolvedValue(feature());

        const saved = await service.updateFeature(1, { title: 'new' });

        expect(saved.title).toBe('new');
        expect(saved.description).toBe('d');
      });
    });

    describe('deleteFeature', () => {
      it('no-ops when feature not found', async () => {
        featureRepo.findById.mockResolvedValue(null);

        await service.deleteFeature(1);

        expect(featureRepo.delete).not.toHaveBeenCalled();
      });

      it('removes blob when imageUrl present and invalidates caches', async () => {
        const f = feature();
        f.imageUrl = 'img-key';
        featureRepo.findById.mockResolvedValue(f);

        await service.deleteFeature(1);

        expect(blobService.deleteFile).toHaveBeenCalledWith('img-key', BUCKET);
        expect(featureRepo.delete).toHaveBeenCalledWith(1);
        expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.features);
        expect(cache.del).toHaveBeenCalledWith('home:file:img-key');
      });

      it('swallows blob errors during delete', async () => {
        const f = feature();
        f.imageUrl = 'img-key';
        featureRepo.findById.mockResolvedValue(f);
        blobService.deleteFile.mockRejectedValueOnce(new Error('boom'));

        await expect(service.deleteFeature(1)).resolves.toBeUndefined();
        expect(featureRepo.delete).toHaveBeenCalledWith(1);
      });
    });

    describe('reorderFeatures', () => {
      it('applies orders, invalidates cache and returns the ordered list', async () => {
        featureRepo.findAllOrdered.mockResolvedValue([feature()]);

        const res = await service.reorderFeatures({
          items: [{ id: 1, order: 2 }],
        });

        expect(featureRepo.applyOrders).toHaveBeenCalledWith([
          { id: 1, order: 2 },
        ]);
        expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.features);
        expect(res).toHaveLength(1);
      });
    });

    describe('uploadFeatureImage', () => {
      it('throws when no file', async () => {
        await expect(
          service.uploadFeatureImage(1, undefined as any),
        ).rejects.toThrow(HttpException);
      });

      it('throws NOT_FOUND when feature missing', async () => {
        featureRepo.findById.mockResolvedValue(null);

        await expect(service.uploadFeatureImage(1, fakeFile)).rejects.toThrow(
          HttpException,
        );
      });

      it('uploads, replaces previous image and invalidates caches', async () => {
        const f = feature();
        f.imageUrl = 'old';
        featureRepo.findById.mockResolvedValue(f);

        const saved = await service.uploadFeatureImage(1, fakeFile);

        expect(saved.imageUrl).toBe('new-key');
        expect(blobService.deleteFile).toHaveBeenCalledWith('old', BUCKET);
        expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.features);
      });
    });
  });

  describe('supporters', () => {
    const supporter = (id = 1): HomeSupporter => {
      const s = new HomeSupporter();
      s.id = id;
      s.name = 'Acme';
      s.link = 'https://acme.com';
      s.logoUrl = null;
      s.order = 0;
      return s;
    };

    describe('getSupporters', () => {
      it('wraps repo via cache', async () => {
        supporterRepo.findAllOrdered.mockResolvedValue([supporter()]);

        const result = await service.getSupporters();
        expect(result).toHaveLength(1);
        expect(cache.wrap.mock.calls[0][0]).toBe(CACHE_KEYS.supporters);
      });
    });

    describe('createSupporter', () => {
      it('places the new supporter at the end', async () => {
        supporterRepo.maxOrder.mockResolvedValue(2);

        const saved = await service.createSupporter({
          name: 'X',
          link: 'https://x.com',
        });

        expect(saved.order).toBe(3);
        expect(saved.name).toBe('X');
        expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.supporters);
      });
    });

    describe('updateSupporter', () => {
      it('throws NOT_FOUND when supporter does not exist', async () => {
        supporterRepo.findById.mockResolvedValue(null);

        await expect(service.updateSupporter(1, { name: 'x' })).rejects.toThrow(
          HttpException,
        );
      });

      it('patches fields and invalidates cache', async () => {
        supporterRepo.findById.mockResolvedValue(supporter());

        const saved = await service.updateSupporter(1, {
          name: 'Novo',
          link: 'https://novo.com',
        });

        expect(saved.name).toBe('Novo');
        expect(saved.link).toBe('https://novo.com');
        expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.supporters);
      });
    });

    describe('createSupporter — description', () => {
      it('persiste description quando fornecida', async () => {
        supporterRepo.maxOrder.mockResolvedValue(0);
        const dto = {
          name: 'ACME',
          link: 'https://acme.com',
          description: 'Empresa apoiadora',
        };
        await service.createSupporter(dto as any);
        expect(supporterRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'Empresa apoiadora' }),
        );
      });

      it('aceita description ausente (null)', async () => {
        supporterRepo.maxOrder.mockResolvedValue(0);
        const dto = { name: 'ACME', link: 'https://acme.com' };
        await service.createSupporter(dto as any);
        expect(supporterRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'ACME', link: 'https://acme.com' }),
        );
      });
    });

    describe('updateSupporter — description', () => {
      it('atualiza description quando fornecida', async () => {
        const existing = {
          id: 1,
          name: 'ACME',
          link: 'https://acme.com',
          description: null,
        } as HomeSupporter;
        supporterRepo.findById.mockResolvedValue(existing);
        await service.updateSupporter(1, {
          description: 'Nova descrição',
        } as any);
        expect(supporterRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'Nova descrição' }),
        );
      });
    });

    describe('deleteSupporter', () => {
      it('no-ops when supporter not found', async () => {
        supporterRepo.findById.mockResolvedValue(null);

        await service.deleteSupporter(1);

        expect(supporterRepo.delete).not.toHaveBeenCalled();
      });

      it('deletes blob when logoUrl present and invalidates caches', async () => {
        const s = supporter();
        s.logoUrl = 'logo-key';
        supporterRepo.findById.mockResolvedValue(s);

        await service.deleteSupporter(1);

        expect(blobService.deleteFile).toHaveBeenCalledWith('logo-key', BUCKET);
        expect(supporterRepo.delete).toHaveBeenCalledWith(1);
        expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.supporters);
      });

      it('swallows blob errors during delete', async () => {
        const s = supporter();
        s.logoUrl = 'logo-key';
        supporterRepo.findById.mockResolvedValue(s);
        blobService.deleteFile.mockRejectedValueOnce(new Error('boom'));

        await expect(service.deleteSupporter(1)).resolves.toBeUndefined();
      });
    });

    describe('reorderSupporters', () => {
      it('applies orders and returns list', async () => {
        supporterRepo.findAllOrdered.mockResolvedValue([supporter()]);

        const res = await service.reorderSupporters({
          items: [{ id: 1, order: 5 }],
        });

        expect(supporterRepo.applyOrders).toHaveBeenCalled();
        expect(res).toHaveLength(1);
      });
    });

    describe('uploadSupporterLogo', () => {
      it('throws when no file', async () => {
        await expect(
          service.uploadSupporterLogo(1, undefined as any),
        ).rejects.toThrow(HttpException);
      });

      it('throws NOT_FOUND when supporter missing', async () => {
        supporterRepo.findById.mockResolvedValue(null);

        await expect(service.uploadSupporterLogo(1, fakeFile)).rejects.toThrow(
          HttpException,
        );
      });

      it('uploads new logo, removes previous and invalidates caches', async () => {
        const s = supporter();
        s.logoUrl = 'old-logo';
        supporterRepo.findById.mockResolvedValue(s);

        const saved = await service.uploadSupporterLogo(1, fakeFile);

        expect(saved.logoUrl).toBe('new-key');
        expect(blobService.deleteFile).toHaveBeenCalledWith('old-logo', BUCKET);
        expect(cache.del).toHaveBeenCalledWith(CACHE_KEYS.supporters);
      });

      it('skips previous-key cleanup when supporter had no logoUrl', async () => {
        supporterRepo.findById.mockResolvedValue(supporter());

        const saved = await service.uploadSupporterLogo(1, fakeFile);

        expect(saved.logoUrl).toBe('new-key');
        expect(blobService.deleteFile).not.toHaveBeenCalled();
      });
    });
  });
});
