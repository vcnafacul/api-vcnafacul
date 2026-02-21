import { FrenteProxyService } from './frente.service';

describe('FrenteProxyService', () => {
  let service: FrenteProxyService;
  let mockAxios: { get: jest.Mock; post: jest.Mock; patch: jest.Mock };
  let mockCache: { wrap: jest.Mock };

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };
    mockCache = {
      wrap: jest.fn((key, fn) => fn()),
    };

    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('http://localhost:3001') };

    service = new FrenteProxyService(
      mockFactory as any,
      mockEnv as any,
      mockCache as any,
    );
  });

  describe('create', () => {
    it('should translate name to nome and forward materia ObjectId', async () => {
      mockAxios.post.mockResolvedValue({ _id: 'new-frente' });

      await service.create({ name: 'Genética', materia: 'materia-obj-id', extra: 'value' });

      expect(mockAxios.post).toHaveBeenCalledWith('v1/frente', {
        nome: 'Genética',
        materia: 'materia-obj-id',
        extra: 'value',
      });
    });

    it('should omit materia if not provided', async () => {
      mockAxios.post.mockResolvedValue({ _id: 'new-frente' });

      await service.create({ name: 'Test' });

      expect(mockAxios.post).toHaveBeenCalledWith('v1/frente', {
        nome: 'Test',
      });
    });
  });

  describe('update', () => {
    it('should translate name to nome', async () => {
      mockAxios.patch.mockResolvedValue({});

      await service.update('frente-id', { name: 'Novo Nome', description: 'desc' });

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/frente/frente-id', {
        nome: 'Novo Nome',
        description: 'desc',
      });
    });

    it('should not add nome if name is not provided', async () => {
      mockAxios.patch.mockResolvedValue({});

      await service.update('frente-id', { description: 'desc' });

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/frente/frente-id', {
        description: 'desc',
      });
    });
  });

  describe('getByMateria', () => {
    it('should forward materia ObjectId directly to ms-simulado', async () => {
      mockAxios.get.mockResolvedValue([{ _id: 'frente-1' }]);

      const result = await service.getByMateria('materia-obj-id');

      expect(mockAxios.get).toHaveBeenCalledWith('v1/frente/materia/materia-obj-id');
      expect(result).toEqual([{ _id: 'frente-1' }]);
    });
  });

  describe('getByMateriaContentApproved', () => {
    it('should use cache and forward materia ObjectId directly', async () => {
      mockAxios.get.mockResolvedValue([{ nome: 'Frente 1', subjects: [] }]);

      await service.getByMateriaContentApproved('materia-obj-id');

      expect(mockCache.wrap).toHaveBeenCalledWith(
        'frente:materiawithcontent:materia-obj-id',
        expect.any(Function),
      );
      expect(mockAxios.get).toHaveBeenCalledWith(
        'v1/frente/materiawithcontent/materia-obj-id',
      );
    });
  });

  describe('CRUD operations', () => {
    it('getAll should pass page and limit', async () => {
      mockAxios.get.mockResolvedValue({ data: [], totalItems: 0 });

      await service.getAll(2, 10);

      expect(mockAxios.get).toHaveBeenCalledWith('v1/frente?page=2&limit=10');
    });

    it('getById should call correct URL', async () => {
      mockAxios.get.mockResolvedValue({ _id: 'abc' });

      await service.getById('abc');

      expect(mockAxios.get).toHaveBeenCalledWith('v1/frente/abc');
    });
  });
});
