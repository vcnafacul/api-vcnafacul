import { ProvaService } from './prova.service';

/** tickets/027, card 02 — o pedido chega ao ms com o ator no header. */
describe('ProvaService.duplicar', () => {
  it('POST v1/prova/:id/duplicar com o nome e o x-ator', async () => {
    const service = Object.create(ProvaService.prototype) as ProvaService;
    const post = jest.fn().mockResolvedValue({ _id: 'p2' });
    (service as any).axios = { post };
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
});
