import { BaseRepository } from './base.repository';

describe('BaseRepository', () => {
  let repo: BaseRepository<any>;
  let mockQueryBuilder: any;
  let mockTypeOrmRepo: any;

  beforeEach(() => {
    mockQueryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    mockTypeOrmRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      create: jest.fn((e) => e),
      save: jest.fn((e) => e),
      findOne: jest.fn(),
      findOneByOrFail: jest.fn(),
      softDelete: jest.fn(),
      delete: jest.fn(),
    };

    repo = new BaseRepository(mockTypeOrmRepo);
  });

  describe('findAllBy', () => {
    it('should return paginated results', async () => {
      const items = [{ id: '1' }];
      mockQueryBuilder.getMany.mockResolvedValue(items);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await repo.findAllBy({ page: 1, limit: 10, where: {} });

      expect(result).toEqual({
        data: items,
        page: 1,
        limit: 10,
        totalItems: 1,
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should calculate correct offset for page 2', async () => {
      await repo.findAllBy({ page: 2, limit: 5, where: {} });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
    });

    it('⚠️ ecoa page e limit no corpo PRESERVANDO o tipo que recebeu', async () => {
      // O corpo da resposta carrega estes dois campos para o client. A Task 1
      // fez o pipe entregar `number` aqui; este teste prova que o repositório
      // não os converte de volta, e portanto que o formato do corpo mudou de
      // `"limit":"10"` para `"limit":10` de propósito, e não por acidente.
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await repo.findAllBy({ page: 2, limit: 10, where: {} });

      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('⚠️ o skip nasce da aritmetica de page e limit — nunca negativo com entrada valida', async () => {
      // `.skip()` recebia `NaN` ou negativo quando `page` era string invalida,
      // e era dai que saia o 500. Com `@Min(1)` na borda, o menor skip e 0.
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await repo.findAllBy({ page: 1, limit: 10, where: {} });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('create', () => {
    it('should create and save entity', async () => {
      const entity = { name: 'test' };
      const result = await repo.create(entity);

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(entity);
      expect(mockTypeOrmRepo.save).toHaveBeenCalled();
      expect(result).toEqual(entity);
    });
  });

  describe('findOneBy', () => {
    it('should find one entity', async () => {
      const entity = { id: '1' };
      mockTypeOrmRepo.findOne.mockResolvedValue(entity);

      const result = await repo.findOneBy({ id: '1' });

      expect(result).toEqual(entity);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('findOneOrFailBy', () => {
    it('should find one entity or fail', async () => {
      const entity = { id: '1' };
      mockTypeOrmRepo.findOneByOrFail.mockResolvedValue(entity);

      const result = await repo.findOneOrFailBy({ id: '1' });

      expect(result).toEqual(entity);
    });
  });

  describe('update', () => {
    it('should save entity', async () => {
      const entity = { id: '1', name: 'updated' };
      await repo.update(entity);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(entity);
    });
  });

  describe('softDelete', () => {
    it('should soft delete by id', async () => {
      await repo.softDelete('id-123');
      expect(mockTypeOrmRepo.softDelete).toHaveBeenCalledWith('id-123');
    });
  });

  describe('delete', () => {
    it('should hard delete by id', async () => {
      await repo.delete('id-123');
      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith('id-123');
    });
  });
});
