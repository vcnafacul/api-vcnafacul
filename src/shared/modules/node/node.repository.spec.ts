import { NodeRepository } from './node.repository';

describe('NodeRepository', () => {
  let repo: NodeRepository<any>;
  let mockTypeOrmRepo: any;

  beforeEach(() => {
    mockTypeOrmRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneByOrFail: jest.fn(),
      softDelete: jest.fn(),
      delete: jest.fn(),
    };
    repo = new NodeRepository(mockTypeOrmRepo);
  });

  describe('getOrder', () => {
    it('should return nodes in linked-list order', async () => {
      const nodes = [
        { id: 'a', next: 'b', prev: null },
        { id: 'c', next: null, prev: 'b' },
        { id: 'b', next: 'c', prev: 'a' },
      ] as any[];

      const result = await repo.getOrder(nodes, 'a');

      expect(result).toEqual([
        { id: 'a', next: 'b', prev: null },
        { id: 'b', next: 'c', prev: 'a' },
        { id: 'c', next: null, prev: 'b' },
      ]);
    });

    it('should return empty array when start node not found', async () => {
      const nodes = [{ id: 'a', next: null, prev: null }] as any[];
      const result = await repo.getOrder(nodes, 'nonexistent');
      expect(result).toEqual([]);
    });

    it('should return single node', async () => {
      const nodes = [{ id: 'a', next: null, prev: null }] as any[];
      const result = await repo.getOrder(nodes, 'a');
      expect(result).toEqual([{ id: 'a', next: null, prev: null }]);
    });
  });
});
