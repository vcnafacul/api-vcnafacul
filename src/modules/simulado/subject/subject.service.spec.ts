import { SubjectProxyService } from './subject.service';

describe('SubjectProxyService', () => {
  let service: SubjectProxyService;
  let mockAxios: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('http://localhost:3001') };

    service = new SubjectProxyService(mockFactory as any, mockEnv as any);
  });

  describe('changeOrder', () => {
    it('should translate LinkedList format {node1, node2} to {id1, id2} swap', async () => {
      mockAxios.patch.mockResolvedValue({});

      await service.changeOrder({ node1: 'aaa', node2: 'bbb', listId: 'list-1' });

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/subject/swap-order', {
        id1: 'aaa',
        id2: 'bbb',
      });
    });

    it('should forward body as-is when node1/node2 not present', async () => {
      mockAxios.patch.mockResolvedValue({});

      const body = { id1: 'aaa', id2: 'bbb' };
      await service.changeOrder(body);

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/subject/order', body);
    });

    it('should not use swap-order when only node1 is present', async () => {
      mockAxios.patch.mockResolvedValue({});

      const body = { node1: 'aaa' };
      await service.changeOrder(body);

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/subject/order', body);
    });
  });

  describe('CRUD operations', () => {
    it('create should post body to v1/subject', async () => {
      mockAxios.post.mockResolvedValue({ _id: 'new' });

      await service.create({ name: 'Tema 1', frente: 'frente-id' });

      expect(mockAxios.post).toHaveBeenCalledWith('v1/subject', {
        name: 'Tema 1',
        frente: 'frente-id',
      });
    });

    it('getAll should build URL with page, limit and optional frente', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      await service.getAll(1, 20, 'frente-id');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'v1/subject?page=1&limit=20&frente=frente-id',
      );
    });

    it('getAll should omit frente when not provided', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      await service.getAll(1, 20);

      expect(mockAxios.get).toHaveBeenCalledWith('v1/subject?page=1&limit=20');
    });

    it('getById should call correct URL', async () => {
      mockAxios.get.mockResolvedValue({ _id: 'abc' });

      await service.getById('abc');

      expect(mockAxios.get).toHaveBeenCalledWith('v1/subject/abc');
    });

    it('getByFrente should call correct URL', async () => {
      mockAxios.get.mockResolvedValue([]);

      await service.getByFrente('frente-id');

      expect(mockAxios.get).toHaveBeenCalledWith('v1/subject/frente/frente-id');
    });

    it('update should patch with id in URL', async () => {
      mockAxios.patch.mockResolvedValue({});

      await service.update('sub-id', { name: 'Updated' });

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/subject/sub-id', {
        name: 'Updated',
      });
    });

    it('delete should call correct URL', async () => {
      mockAxios.delete.mockResolvedValue({});

      await service.delete('sub-id');

      expect(mockAxios.delete).toHaveBeenCalledWith('v1/subject/sub-id');
    });
  });
});
