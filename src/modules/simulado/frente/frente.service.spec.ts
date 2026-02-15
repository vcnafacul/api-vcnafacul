import { FrenteProxyService } from './frente.service';

describe('FrenteProxyService', () => {
  let service: FrenteProxyService;
  let mockAxios: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; delete: jest.Mock };
  let mockCache: { wrap: jest.Mock };

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
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

  describe('materia enum <-> ObjectId mapping', () => {
    const fakeMaterias = [
      { _id: 'id-portugues', nome: 'Língua Portuguesa' },
      { _id: 'id-biologia', nome: 'Biologia' },
      { _id: 'id-matematica', nome: 'Matemática' },
    ];

    beforeEach(() => {
      mockAxios.get.mockResolvedValue(fakeMaterias);
    });

    it('should map enum index to ObjectId', async () => {
      const result = await service.enumToObjectId(0);
      expect(result).toBe('id-portugues');
    });

    it('should map enum index 3 (Biologia) to ObjectId', async () => {
      const result = await service.enumToObjectId(3);
      expect(result).toBe('id-biologia');
    });

    it('should map enum index 6 (Matemática) to ObjectId', async () => {
      const result = await service.enumToObjectId(6);
      expect(result).toBe('id-matematica');
    });

    it('should return null for unknown enum index', async () => {
      const result = await service.enumToObjectId(99);
      expect(result).toBeNull();
    });

    it('should map ObjectId back to enum', async () => {
      const result = await service.objectIdToEnum('id-biologia');
      expect(result).toBe(3);
    });

    it('should return null for unknown ObjectId', async () => {
      const result = await service.objectIdToEnum('id-desconhecido');
      expect(result).toBeNull();
    });

    it('should accept string enum values', async () => {
      const result = await service.enumToObjectId('3');
      expect(result).toBe('id-biologia');
    });

    it('should load mapping only once', async () => {
      await service.enumToObjectId(0);
      await service.enumToObjectId(3);
      await service.objectIdToEnum('id-biologia');
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle response with data wrapper', async () => {
      mockAxios.get.mockResolvedValue({ data: fakeMaterias });
      // Reset cache
      service = new (FrenteProxyService as any)(
        { create: jest.fn().mockReturnValue(mockAxios) },
        { get: jest.fn().mockReturnValue('http://localhost:3001') },
        mockCache,
      );
      const result = await service.enumToObjectId(0);
      expect(result).toBe('id-portugues');
    });

    it('should handle case-insensitive matching', async () => {
      mockAxios.get.mockResolvedValue([
        { _id: 'id-bio', nome: 'BIOLOGIA' },
      ]);
      service = new (FrenteProxyService as any)(
        { create: jest.fn().mockReturnValue(mockAxios) },
        { get: jest.fn().mockReturnValue('http://localhost:3001') },
        mockCache,
      );
      const result = await service.enumToObjectId(3);
      expect(result).toBe('id-bio');
    });
  });

  describe('create', () => {
    it('should translate name to nome and convert materia enum', async () => {
      mockAxios.get.mockResolvedValue([
        { _id: 'id-bio', nome: 'Biologia' },
      ]);
      mockAxios.post.mockResolvedValue({ _id: 'new-frente' });

      await service.create({ name: 'Genética', materia: 3, extra: 'value' });

      expect(mockAxios.post).toHaveBeenCalledWith('v1/frente', {
        nome: 'Genética',
        materia: 'id-bio',
        extra: 'value',
      });
    });

    it('should omit materia if enum not found', async () => {
      mockAxios.get.mockResolvedValue([]);
      mockAxios.post.mockResolvedValue({ _id: 'new-frente' });

      await service.create({ name: 'Test', materia: 99 });

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
    it('should convert enum and call ms-simulado', async () => {
      mockAxios.get.mockResolvedValueOnce([
        { _id: 'id-bio', nome: 'Biologia' },
      ]);
      mockAxios.get.mockResolvedValueOnce([{ _id: 'frente-1' }]);

      const result = await service.getByMateria('3');

      expect(mockAxios.get).toHaveBeenCalledWith('v1/frente/materia/id-bio');
      expect(result).toEqual([{ _id: 'frente-1' }]);
    });

    it('should return empty array if materia not found', async () => {
      mockAxios.get.mockResolvedValue([]);

      const result = await service.getByMateria('99');

      expect(result).toEqual([]);
    });
  });

  describe('getByMateriaContentApproved', () => {
    it('should use cache and convert materia enum', async () => {
      mockAxios.get.mockResolvedValueOnce([
        { _id: 'id-bio', nome: 'Biologia' },
      ]);
      mockAxios.get.mockResolvedValueOnce([{ nome: 'Frente 1', subjects: [] }]);

      await service.getByMateriaContentApproved('3');

      expect(mockCache.wrap).toHaveBeenCalledWith(
        'frente:materiawithcontent:3',
        expect.any(Function),
      );
      expect(mockAxios.get).toHaveBeenCalledWith(
        'v1/frente/materiawithcontent/id-bio',
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

    it('delete should call correct URL', async () => {
      mockAxios.delete.mockResolvedValue({});

      await service.delete('abc');

      expect(mockAxios.delete).toHaveBeenCalledWith('v1/frente/abc');
    });
  });
});
