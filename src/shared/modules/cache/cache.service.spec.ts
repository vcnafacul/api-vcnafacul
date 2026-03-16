import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockCacheManager: any;

  beforeEach(() => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    service = new CacheService(mockCacheManager);
  });

  describe('wrap', () => {
    it('should return cached value when it exists', async () => {
      mockCacheManager.get.mockResolvedValue('cached-value');
      const fn = jest.fn();

      const result = await service.wrap('key', fn);

      expect(result).toBe('cached-value');
      expect(fn).not.toHaveBeenCalled();
      expect(mockCacheManager.get).toHaveBeenCalledWith('key');
    });

    it('should call fn and cache result when cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      const fn = jest.fn().mockResolvedValue('new-value');

      const result = await service.wrap('key', fn, 5000);

      expect(result).toBe('new-value');
      expect(fn).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith('key', 'new-value', 5000);
    });

    it('should use default TTL', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      const fn = jest.fn().mockResolvedValue('val');

      await service.wrap('key', fn);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'key',
        'val',
        60 * 60 * 24 * 1000,
      );
    });
  });

  describe('del', () => {
    it('should delete cache entry', async () => {
      await service.del('key');
      expect(mockCacheManager.del).toHaveBeenCalledWith('key');
    });
  });

  describe('set', () => {
    it('should set cache value with ttl', async () => {
      await service.set('key', 'value', 1000);
      expect(mockCacheManager.set).toHaveBeenCalledWith('key', 'value', 1000);
    });

    it('should use default TTL', async () => {
      await service.set('key', 'value');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'key',
        'value',
        60 * 60 * 24 * 1000,
      );
    });
  });
});
