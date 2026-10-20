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
  let mockUserService: { findUserById: jest.Mock; findNomesPorIds: jest.Mock };

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

    mockUserService = {
      findUserById: jest.fn().mockResolvedValue({
        firstName: 'João',
        lastName: 'Silva',
        socialName: null,
        useSocialName: false,
      }),
      // Nomes em lote: `u-ana` → Ana, `u-bia` → Bia; os outros ficam sem nome.
      findNomesPorIds: jest.fn(async (ids: string[]) => {
        const todos = new Map([
          ['u-ana', 'Ana Souza'],
          ['u-bia', 'Bia Lima'],
        ]);
        return new Map(
          ids.filter((id) => todos.has(id)).map((id) => [id, todos.get(id)]),
        );
      }),
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
      mockUserService as any,
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

  describe('nomes na listagem (048/06)', () => {
    it('⚠️ 3 demandas do mesmo criador → UMA consulta de usuários, com ids únicos', async () => {
      mockAxios.get.mockResolvedValue({
        data: [
          { _id: '1', userId: 'u-ana', file: { uploadedBy: 'u-bia' } },
          { _id: '2', userId: 'u-ana', file: { uploadedBy: 'u-ana' } },
          { _id: '3', userId: 'u-ana' },
        ],
        page: 1,
        limit: 40,
        totalItems: 3,
      });

      const out = await service.getAll({ status: 3 });

      expect(mockUserService.findNomesPorIds).toHaveBeenCalledTimes(1);
      expect([...mockUserService.findNomesPorIds.mock.calls[0][0]].sort()).toEqual(
        ['u-ana', 'u-bia'],
      );
      expect(out.data[0]).toMatchObject({
        createdByName: 'Ana Souza',
        uploadedByName: 'Bia Lima',
      });
      expect(out.data[1].uploadedByName).toBe('Ana Souza');
      expect(out).toMatchObject({ page: 1, totalItems: 3 });
    });

    it('demanda sem arquivo não ganha uploadedByName; id sem usuário vira o próprio id', async () => {
      mockAxios.get.mockResolvedValue({
        data: [{ _id: '3', userId: 'u-sumido' }],
      });

      const out = await service.getAll({});

      expect(out.data[0]).not.toHaveProperty('uploadedByName');
      expect(out.data[0].createdByName).toBe('u-sumido');
    });

    it('o que o ms mandar que não seja página passa intacto', async () => {
      mockAxios.get.mockResolvedValue(undefined);
      expect(await service.getAll({})).toBeUndefined();
      expect(mockUserService.findNomesPorIds).not.toHaveBeenCalled();
    });

    it('propostas: autor e revisor resolvidos numa consulta só', async () => {
      mockAxios.get.mockResolvedValue([
        { _id: 'p1', author: 'u-ana', reviewedBy: 'u-bia' },
        { _id: 'p2', author: 'u-bia' },
      ]);

      const out = await service.getProposalsByContent('c1');

      expect(mockUserService.findNomesPorIds).toHaveBeenCalledTimes(1);
      expect(out[0]).toMatchObject({
        authorName: 'Ana Souza',
        reviewedByName: 'Bia Lima',
      });
      expect(out[1].authorName).toBe('Bia Lima');
      expect(out[1]).not.toHaveProperty('reviewedByName');
    });

    it('histórico: uma consulta para todas as entradas', async () => {
      mockAxios.get.mockResolvedValue([
        { _id: 'h1', uploadedBy: 'u-ana' },
        { _id: 'h2', uploadedBy: 'u-ana' },
      ]);

      const out = await service.getFileHistory('c1');

      expect(mockUserService.findNomesPorIds).toHaveBeenCalledTimes(1);
      expect(out.map((h) => h.uploadedByName)).toEqual([
        'Ana Souza',
        'Ana Souza',
      ]);
    });

    it('banco fora → nomes viram ids, sem derrubar a listagem', async () => {
      mockUserService.findNomesPorIds.mockRejectedValueOnce(new Error('db'));
      mockAxios.get.mockResolvedValue({ data: [{ _id: '1', userId: 'u-ana' }] });

      const out = await service.getAll({});

      expect(out.data[0].createdByName).toBe('u-ana');
    });
  });

  describe('sendVideo (049/02)', () => {
    it('link válido → file-content de vídeo no ms, sem R2', async () => {
      mockAxios.get.mockResolvedValue({ _id: 'c1', subject: {} });
      mockAxios.post.mockResolvedValue({ _id: 'fc1' });

      const out = await service.sendVideo(
        'c1',
        'user-1',
        'https://youtu.be/dQw4w9WgXcQ?si=x',
      );

      expect(mockAxios.post).toHaveBeenCalledWith('v1/file-content', {
        tipo: 'video',
        videoId: 'dQw4w9WgXcQ',
        content: 'c1',
        uploadedBy: 'user-1',
      });
      expect(mockBlobService.uploadFile).not.toHaveBeenCalled();
      expect(out).toEqual({ videoId: 'dQw4w9WgXcQ' });
    });

    it('link de shorts → 400 e nada vai ao ms', async () => {
      await expect(
        service.sendVideo(
          'c1',
          'user-1',
          'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('demanda inexistente → 404', async () => {
      mockAxios.get.mockResolvedValue(null);
      await expect(
        service.sendVideo('nope', 'user-1', 'https://youtu.be/dQw4w9WgXcQ'),
      ).rejects.toMatchObject({ status: 404 });
      expect(mockAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('proposta e leitura com vídeo (049/03)', () => {
    it('proposta com url → standalone de vídeo + adjustment-proposal, sem R2', async () => {
      mockAxios.get.mockResolvedValue({ _id: 'c1', subject: {} });
      mockAxios.post
        .mockResolvedValueOnce({ _id: 'fc-v' })
        .mockResolvedValueOnce({ _id: 'p1' });

      await service.uploadProposal(
        'c1',
        'u1',
        undefined,
        'troca pelo vídeo',
        'https://youtu.be/dQw4w9WgXcQ',
      );

      expect(mockAxios.post).toHaveBeenNthCalledWith(
        1,
        'v1/file-content/standalone',
        { tipo: 'video', videoId: 'dQw4w9WgXcQ', content: 'c1', uploadedBy: 'u1' },
      );
      expect(mockAxios.post).toHaveBeenNthCalledWith(2, 'v1/adjustment-proposal', {
        content: 'c1',
        file: 'fc-v',
        author: 'u1',
        comment: 'troca pelo vídeo',
      });
      expect(mockBlobService.uploadFile).not.toHaveBeenCalled();
    });

    it('proposta com arquivo continua indo ao R2 e ao standalone de documento', async () => {
      mockAxios.get.mockResolvedValue({ _id: 'c1', title: 'T', subject: {} });
      mockBlobService.uploadFile.mockResolvedValue('k1');
      mockAxios.post
        .mockResolvedValueOnce({ _id: 'fc-d' })
        .mockResolvedValueOnce({ _id: 'p1' });

      await service.uploadProposal('c1', 'u1', {
        originalname: 'a.docx',
      } as any);

      expect(mockBlobService.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockAxios.post).toHaveBeenNthCalledWith(
        1,
        'v1/file-content/standalone',
        { fileKey: 'k1', originalName: 'a.docx', content: 'c1', uploadedBy: 'u1' },
      );
    });

    it('sem arquivo e sem url → 400; os dois → 400; url de shorts → 400', async () => {
      await expect(service.uploadProposal('c1', 'u1')).rejects.toMatchObject({
        status: 400,
      });
      await expect(
        service.uploadProposal(
          'c1',
          'u1',
          { originalname: 'a.docx' } as any,
          undefined,
          'https://youtu.be/dQw4w9WgXcQ',
        ),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        service.uploadProposal(
          'c1',
          'u1',
          undefined,
          undefined,
          'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('getFile de vídeo → 400 sem ir ao R2', async () => {
      mockAxios.get.mockResolvedValue({
        _id: 'fc-v',
        tipo: 'video',
        videoId: 'dQw4w9WgXcQ',
      });
      await expect(service.getFile('fc-v')).rejects.toMatchObject({
        status: 400,
      });
      expect(mockBlobService.getFile).not.toHaveBeenCalled();
    });

    it('delete: apaga do R2 só o que tem fileKey', async () => {
      mockAxios.get.mockResolvedValue([
        { _id: 'fc-d', fileKey: 'k1' },
        { _id: 'fc-v', tipo: 'video', videoId: 'dQw4w9WgXcQ' },
      ]);
      mockAxios.delete.mockResolvedValue({});

      await service.delete('c1');

      expect(mockBlobService.deleteFile).toHaveBeenCalledTimes(1);
      expect(mockBlobService.deleteFile).toHaveBeenCalledWith('k1', 'test-bucket');
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/file-content/fc-d');
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/file-content/fc-v');
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/content/c1');
    });
  });

  describe('getTimeline (050/02)', () => {
    const porUrl = (url: string) => {
      if (url.endsWith('/populated'))
        return { _id: 'c1', userId: 'u-ana', createdAt: '2026-09-01T12:00:00.000Z', approvedBy: 'u-bia' };
      if (url.includes('content-file-history'))
        return [{ createdAt: '2026-09-01T12:10:00.000Z', uploadedBy: 'u-bia', source: 'initial_upload', file: { _id: 'f1' } }];
      if (url.includes('adjustment-proposal')) return [];
      if (url.includes('auditLog'))
        return [{ user: 'u-bia', entityType: 'Content', createdAt: '2026-09-01T12:20:00.000Z', changes: '{"status":1,"message":"x"}' }];
      return undefined;
    };

    it('junta as fontes, ordena e resolve os nomes numa consulta só', async () => {
      mockAxios.get.mockImplementation(async (url: string) => porUrl(url));

      const { eventos } = await service.getTimeline('c1');

      expect(eventos.map((e) => `${e.tipo}:${e.por}`)).toEqual([
        'criada:Ana Souza',
        'enviada:Bia Lima',
        'aprovada:Bia Lima',
      ]);
      expect(mockUserService.findNomesPorIds).toHaveBeenCalledTimes(1);
      expect([...mockUserService.findNomesPorIds.mock.calls[0][0]].sort()).toEqual(['u-ana', 'u-bia']);
    });

    it('demanda inexistente → 404 antes das outras chamadas', async () => {
      mockAxios.get.mockResolvedValue(null);
      await expect(service.getTimeline('nope')).rejects.toMatchObject({ status: 404 });
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });

    it('listagem anexa approvedByName', async () => {
      mockAxios.get.mockResolvedValue({ data: [{ _id: '1', userId: 'u-ana', approvedBy: 'u-bia' }] });
      const out = await service.getAll({});
      expect(out.data[0]).toMatchObject({ createdByName: 'Ana Souza', approvedByName: 'Bia Lima' });
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
    it('should send orderedIds to reorder endpoint', async () => {
      mockAxios.patch.mockResolvedValue({});

      await service.changeOrder({ orderedIds: ['aaa', 'bbb', 'ccc'] });

      expect(mockAxios.patch).toHaveBeenCalledWith('v1/content/reorder', {
        orderedIds: ['aaa', 'bbb', 'ccc'],
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
    it('getById lê a rota populada e anexa criador e quem enviou', async () => {
      mockAxios.get.mockResolvedValue({
        _id: 'abc',
        title: 'Test',
        userId: 'u-ana',
        file: { _id: 'f1', uploadedBy: 'u-bia' },
        lastEditedBy: 'u-bia',
      });
      const out = await service.getById('abc');
      expect(mockAxios.get).toHaveBeenCalledWith('v1/content/abc/populated');
      expect(out).toMatchObject({
        createdByName: 'Ana Souza',
        uploadedByName: 'Bia Lima',
        lastEditedByName: 'Bia Lima',
      });
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
      await service.changeStatus('id-1', 1, 'user-1');
      expect(mockAxios.patch).toHaveBeenCalledWith('v1/content/id-1/status', {
        status: 1,
        userId: 'user-1',
      });
      expect(mockCache.del).toHaveBeenCalledWith('content:summary');
      expect(mockCache.del).toHaveBeenCalledWith('content:stats-by-frente');
      expect(mockCache.del).toHaveBeenCalledWith(
        'frente:materiawithcontent:mat-1',
      );
    });

    it('changeStatus com motivo manda `message` ao ms (rejeição, 048/03)', async () => {
      mockAxios.patch.mockResolvedValue({});
      mockAxios.get.mockResolvedValue({});
      await service.changeStatus('id-1', 2, 'user-1', 'Faltou a bibliografia');
      expect(mockAxios.patch).toHaveBeenCalledWith('v1/content/id-1/status', {
        status: 2,
        userId: 'user-1',
        message: 'Faltou a bibliografia',
      });
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
