import { HttpException } from '@nestjs/common';
import { ContentProxyService } from './content.service';

describe('ContentProxyService', () => {
  let service: ContentProxyService;
  let mockAxios: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };
  let mockBlobService: {
    uploadFile: jest.Mock;
    getFile: jest.Mock;
    deleteFile: jest.Mock;
  };
  let mockCache: { wrap: jest.Mock; del: jest.Mock };

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };
    mockBlobService = {
      uploadFile: jest.fn(),
      getFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    mockCache = {
      wrap: jest.fn((key, fn) => fn()),
      del: jest.fn(),
    };

    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = {
      get: jest.fn((key: string) => {
        if (key === 'SIMULADO_URL') return 'http://localhost:3001';
        if (key === 'BUCKET_CONTENT') return 'test-bucket';
        return '';
      }),
    };

    service = new ContentProxyService(
      mockFactory as any,
      mockEnv as any,
      mockBlobService as any,
      mockCache as any,
    );
  });

  describe('create', () => {
    it('should translate subjectId to subject and add userId', async () => {
      mockAxios.post.mockResolvedValue({ _id: 'new-content' });

      await service.create(
        { subjectId: 'sub-123', title: 'Mitose', description: 'desc' },
        'user-456',
      );

      expect(mockAxios.post).toHaveBeenCalledWith('v1/content', {
        subject: 'sub-123',
        title: 'Mitose',
        description: 'desc',
        userId: 'user-456',
      });
    });

    it('should not include subjectId in the forwarded body', async () => {
      mockAxios.post.mockResolvedValue({});

      await service.create({ subjectId: 'sub-1', title: 'Test' }, 'user-1');

      const calledBody = mockAxios.post.mock.calls[0][1];
      expect(calledBody).not.toHaveProperty('subjectId');
      expect(calledBody).toHaveProperty('subject', 'sub-1');
    });
  });

  describe('getAll', () => {
    it('should forward materia ObjectId directly in query', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      await service.getAll({
        page: '1',
        limit: '10',
        materia: 'materia-obj-id',
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('materia=materia-obj-id'),
      );
    });

    it('should forward other query params as-is', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      await service.getAll({ page: '2', limit: '5', status: '1' });

      const url = mockAxios.get.mock.calls[0][0];
      expect(url).toContain('page=2');
      expect(url).toContain('limit=5');
      expect(url).toContain('status=1');
    });

    it('should skip null/undefined values', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      await service.getAll({
        page: '1',
        limit: '10',
        status: undefined,
        frente: null,
      });

      const url = mockAxios.get.mock.calls[0][0];
      expect(url).not.toContain('status');
      expect(url).not.toContain('frente');
    });
  });

  describe('changeOrder', () => {
    it('should translate LinkedList {node1, node2} to {id1, id2}', async () => {
      mockAxios.patch.mockResolvedValue({});

      await service.changeOrder({ node1: 'aaa', node2: 'bbb' });

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/content/swap-order', {
        id1: 'aaa',
        id2: 'bbb',
      });
    });

    it('should forward body as-is when no node1/node2', async () => {
      mockAxios.patch.mockResolvedValue({});

      await service.changeOrder({ id1: 'aaa', id2: 'bbb' });

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/content/swap-order', {
        id1: 'aaa',
        id2: 'bbb',
      });
    });
  });

  describe('getDirectory (via uploadFile)', () => {
    it('should build directory path from populated content', async () => {
      const populatedContent = {
        title: 'Mitose e Meiose',
        subject: {
          name: 'Divisão Celular',
          frente: {
            nome: 'Citologia',
            materia: { nome: 'Biologia' },
          },
        },
      };
      mockAxios.get.mockResolvedValue(populatedContent);
      mockBlobService.uploadFile.mockResolvedValue('file-key-123');
      mockAxios.post.mockResolvedValue({});

      const file = {
        originalname: 'doc.pdf',
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      await service.uploadFile('content-id', 'user-id', file);

      expect(mockBlobService.uploadFile).toHaveBeenCalledWith(
        file,
        'test-bucket',
        undefined,
        'Biologia/Citologia/Divisao_Celular/Mitose_e_Meiose',
      );
    });

    it('should handle missing nested fields gracefully', async () => {
      const populatedContent = {
        title: 'Test',
        subject: null,
      };
      mockAxios.get.mockResolvedValue(populatedContent);
      mockBlobService.uploadFile.mockResolvedValue('file-key');
      mockAxios.post.mockResolvedValue({});

      const file = {
        originalname: 'doc.pdf',
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      await service.uploadFile('id', 'user', file);

      expect(mockBlobService.uploadFile).toHaveBeenCalledWith(
        file,
        'test-bucket',
        undefined,
        '///Test',
      );
    });
  });

  describe('uploadFile', () => {
    it('should throw if file is not provided', async () => {
      await expect(
        service.uploadFile('id', 'user', null as any),
      ).rejects.toThrow(HttpException);
    });

    it('should throw if content not found', async () => {
      mockAxios.get.mockResolvedValue(null);
      const file = { originalname: 'doc.pdf' } as Express.Multer.File;

      await expect(service.uploadFile('id', 'user', file)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw if upload fails', async () => {
      mockAxios.get.mockResolvedValue({ title: 'T', subject: null });
      mockBlobService.uploadFile.mockResolvedValue(null);
      const file = { originalname: 'doc.pdf' } as Express.Multer.File;

      await expect(service.uploadFile('id', 'user', file)).rejects.toThrow(
        HttpException,
      );
    });

    it('should create file-content after successful upload', async () => {
      mockAxios.get.mockResolvedValue({ title: 'T', subject: null });
      mockBlobService.uploadFile.mockResolvedValue('key-abc');
      mockAxios.post.mockResolvedValue({});

      const file = { originalname: 'my-doc.pdf' } as Express.Multer.File;
      const result = await service.uploadFile('content-id', 'user-id', file);

      expect(mockAxios.post).toHaveBeenCalledWith('v1/file-content', {
        fileKey: 'key-abc',
        originalName: 'my-doc.pdf',
        content: 'content-id',
        uploadedBy: 'user-id',
      });
      expect(result).toEqual({ fileKey: 'key-abc' });
    });
  });

  describe('getStatsByFrente', () => {
    it('should forward stats from ms-simulado as-is', async () => {
      const stats = [
        { materia: 'id-bio', total: 10, approved: 5 },
        { materia: 'id-mat', total: 8, approved: 3 },
      ];
      mockAxios.get.mockResolvedValue(stats);

      const result = await service.getStatsByFrente();

      expect(result).toEqual(stats);
    });

    it('should use cache', async () => {
      mockAxios.get.mockResolvedValue([]);

      await service.getStatsByFrente();

      expect(mockCache.wrap).toHaveBeenCalledWith(
        'content:stats-by-frente',
        expect.any(Function),
      );
    });
  });

  describe('delete', () => {
    it('should delete all file-contents from blob and ms-simulado before deleting content', async () => {
      mockAxios.get.mockResolvedValue([
        { _id: 'fc-1', fileKey: 'key-1' },
        { _id: 'fc-2', fileKey: 'key-2' },
      ]);
      mockBlobService.deleteFile.mockResolvedValue(undefined);
      mockAxios.delete.mockResolvedValue({});

      await service.delete('content-id');

      expect(mockBlobService.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockBlobService.deleteFile).toHaveBeenCalledWith(
        'key-1',
        'test-bucket',
      );
      expect(mockBlobService.deleteFile).toHaveBeenCalledWith(
        'key-2',
        'test-bucket',
      );
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/file-content/fc-1');
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/file-content/fc-2');
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/content/content-id');
    });

    it('should still delete content if no file-contents exist', async () => {
      mockAxios.get.mockResolvedValue([]);
      mockAxios.delete.mockResolvedValue({});

      await service.delete('content-id');

      expect(mockBlobService.deleteFile).not.toHaveBeenCalled();
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/content/content-id');
    });
  });

  describe('simple proxy methods', () => {
    it('getById should call correct URL', async () => {
      mockAxios.get.mockResolvedValue({});
      await service.getById('abc');
      expect(mockAxios.get).toHaveBeenCalledWith('v1/content/abc');
    });

    it('getDemands should pass page and limit', async () => {
      mockAxios.get.mockResolvedValue({});
      await service.getDemands(2, 15);
      expect(mockAxios.get).toHaveBeenCalledWith(
        'v1/content/demand?page=2&limit=15',
      );
    });

    it('changeStatus should patch with status and userId and invalidate caches', async () => {
      mockAxios.patch.mockResolvedValue({});
      mockAxios.get.mockResolvedValue({
        subject: { frente: { materia: { _id: 'mat-1' } } },
      });
      await service.changeStatus('id-1', 2, 'user-1');
      expect(mockAxios.patch).toHaveBeenCalledWith('v1/content/id-1/status', {
        status: 2,
        userId: 'user-1',
      });
      expect(mockCache.del).toHaveBeenCalledWith('content:summary');
      expect(mockCache.del).toHaveBeenCalledWith('content:stats-by-frente');
      expect(mockCache.del).toHaveBeenCalledWith(
        'frente:materiawithcontent:mat-1',
      );
    });

    it('reset should patch with userId and invalidate caches', async () => {
      mockAxios.patch.mockResolvedValue({});
      mockAxios.get.mockResolvedValue({
        subject: { frente: { materia: { _id: 'mat-1' } } },
      });
      await service.reset('id-1', 'user-1');
      expect(mockAxios.patch).toHaveBeenCalledWith('v1/content/id-1/reset', {
        userId: 'user-1',
      });
      expect(mockCache.del).toHaveBeenCalledWith('content:summary');
      expect(mockCache.del).toHaveBeenCalledWith('content:stats-by-frente');
    });

    it('getFile should fetch file-content then get blob', async () => {
      mockAxios.get.mockResolvedValue({ fileKey: 'my-key' });
      mockBlobService.getFile.mockResolvedValue(Buffer.from('data'));

      await service.getFile('fc-id');

      expect(mockAxios.get).toHaveBeenCalledWith('v1/file-content/fc-id');
      expect(mockBlobService.getFile).toHaveBeenCalledWith(
        'my-key',
        'test-bucket',
      );
    });

    it('getFile should throw if file-content not found', async () => {
      mockAxios.get.mockResolvedValue(null);

      await expect(service.getFile('fc-id')).rejects.toThrow(HttpException);
    });

    it('getSummary should use cache', async () => {
      mockAxios.get.mockResolvedValue({ total: 100 });
      await service.getSummary();
      expect(mockCache.wrap).toHaveBeenCalledWith(
        'content:summary',
        expect.any(Function),
      );
    });

    it('getSnapshotContentStatus should use cache', async () => {
      mockAxios.get.mockResolvedValue([]);
      await service.getSnapshotContentStatus();
      expect(mockCache.wrap).toHaveBeenCalledWith(
        'content:snapshot-content-status',
        expect.any(Function),
      );
    });
  });
});
