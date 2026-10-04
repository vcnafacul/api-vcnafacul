import { ProvaService } from './prova.service';

/** tickets/027, card 02 — o pedido chega ao ms com o ator no header. */
describe('ProvaService.duplicar', () => {
  it('POST v1/prova/:id/duplicar com o nome e o x-ator', async () => {
    const service = Object.create(ProvaService.prototype) as ProvaService;
    const post = jest.fn().mockResolvedValue({ _id: 'p2' });
    (service as any).axios = { post, get: jest.fn().mockResolvedValue({}) };
    const ator = {
      userId: 'u',
      cursinhoId: 'A',
      admin: false,
      editorCursinho: true,
    };

    await service.duplicar('abc/1', 'Simulado Espanhol', ator as any);

    const [url, corpo, headers] = post.mock.calls[0];
    expect(url).toBe('v1/prova/abc%2F1/duplicar');
    expect(corpo).toEqual({ nome: 'Simulado Espanhol' });
    expect(JSON.parse(headers['x-ator'])).toMatchObject({
      userId: 'u',
      cursinhoId: 'A',
    });
  });

  describe('arquivos (card 37)', () => {
    function montar(origem: Record<string, unknown>, blob: any = {}) {
      const service = Object.create(ProvaService.prototype) as ProvaService;
      const axios = {
        post: jest.fn().mockResolvedValue({ _id: 'p2', nome: 'Cópia' }),
        get: jest.fn().mockResolvedValue(origem),
        patch: jest.fn().mockResolvedValue({}),
      };
      const blobService = {
        getFile: jest.fn().mockResolvedValue({
          buffer: Buffer.from('PDF').toString('base64'),
          contentType: 'application/pdf',
        }),
        putObjectAtKey: jest.fn().mockResolvedValue(undefined),
        ...blob,
      };
      Object.assign(service as any, {
        axios,
        blobService,
        envService: { get: () => 'bucket-simulado' },
        logger: { warn: jest.fn() },
      });
      return { service, axios, blobService };
    }
    const ator = { userId: 'u', cursinhoId: 'A' } as any;

    it('copia PDF e gabarito para chaves NOVAS e grava na cópia', async () => {
      const { service, axios, blobService } = montar({
        filename: 'orig.pdf',
        gabarito: 'gab.pdf',
      });

      const r = await service.duplicar('p1', 'Cópia', ator);

      expect(axios.get).toHaveBeenCalledWith('v1/prova/p1');
      expect(blobService.getFile).toHaveBeenCalledWith(
        'orig.pdf',
        'bucket-simulado',
      );
      const chaves = blobService.putObjectAtKey.mock.calls.map((c) => c[2]);
      expect(chaves).toHaveLength(2);
      for (const k of chaves) {
        expect(k).toMatch(/\.pdf$/);
        expect(['orig.pdf', 'gab.pdf']).not.toContain(k);
      }
      expect(blobService.putObjectAtKey.mock.calls[0][0]).toEqual(
        Buffer.from('PDF'),
      );
      expect(axios.patch).toHaveBeenCalledWith('v1/prova/p2/files', {
        filename: chaves[0],
        gabarito: chaves[1],
      });
      expect(r).toMatchObject({
        _id: 'p2',
        filename: chaves[0],
        gabarito: chaves[1],
      });
    });

    it('original sem arquivos: não toca no bucket nem no ms', async () => {
      const { service, axios, blobService } = montar({});
      const r = await service.duplicar('p1', 'Cópia', ator);
      expect(blobService.getFile).not.toHaveBeenCalled();
      expect(axios.patch).not.toHaveBeenCalled();
      expect(r).toEqual({ _id: 'p2', nome: 'Cópia' });
    });

    it('⚠️ falha ao copiar o arquivo NÃO desfaz a duplicação', async () => {
      const { service, axios } = montar(
        { filename: 'orig.pdf' },
        { getFile: jest.fn().mockRejectedValue(new Error('NoSuchKey')) },
      );
      const r = await service.duplicar('p1', 'Cópia', ator);
      expect(r).toEqual({ _id: 'p2', nome: 'Cópia' });
      expect(axios.patch).not.toHaveBeenCalled();
    });
  });
});
