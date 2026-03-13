import { BaseService } from './base.service';

describe('BaseService', () => {
  let service: BaseService<any>;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findAllBy: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn(),
    };
    service = new BaseService(mockRepository);
  });

  describe('findAllBy', () => {
    it('should delegate to repository', async () => {
      const params = { page: 1, limit: 10, where: {} };
      const expected = { data: [], page: 1, limit: 10, totalItems: 0 };
      mockRepository.findAllBy.mockResolvedValue(expected);

      const result = await service.findAllBy(params);

      expect(result).toEqual(expected);
      expect(mockRepository.findAllBy).toHaveBeenCalledWith(params);
    });
  });

  describe('delete', () => {
    it('should delegate to repository', async () => {
      await service.delete('id-123');
      expect(mockRepository.delete).toHaveBeenCalledWith('id-123');
    });
  });

  describe('findOneBy', () => {
    it('should delegate to repository', async () => {
      const entity = { id: '1', name: 'test' };
      mockRepository.findOneBy.mockResolvedValue(entity);

      const result = await service.findOneBy({ id: '1' });

      expect(result).toEqual(entity);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
    });
  });
});
