import { CartaoRespostaHttpService } from './cartao-resposta-http.service';

it('baixarCartao chama getBinary com a rota do ms-simulado', async () => {
  const getBinary = jest.fn().mockResolvedValue({
    buffer: Buffer.from('PDF'),
    contentType: 'application/pdf',
  });
  const factory = { create: jest.fn().mockReturnValue({ getBinary }) } as any;
  const env = { get: jest.fn().mockReturnValue('http://ms:3000') } as any;
  const svc = new CartaoRespostaHttpService(factory, env);
  const r = await svc.baixarCartao('665abc');
  expect(factory.create).toHaveBeenCalledWith('http://ms:3000');
  expect(getBinary).toHaveBeenCalledWith('v1/cartao-resposta/665abc');
  expect(r.contentType).toBe('application/pdf');
});

it('criarHistorico faz POST no A3', async () => {
  const post = jest.fn().mockResolvedValue({ historicoId: 'h1' });
  const factory = {
    create: jest.fn().mockReturnValue({ getBinary: jest.fn(), post }),
  } as any;
  const env = { get: jest.fn().mockReturnValue('http://ms:3000') } as any;
  const svc = new CartaoRespostaHttpService(factory, env);
  const r = await svc.criarHistorico({
    usuario: 'u1',
    imageKey: 'cartoes/665/i.jpg',
    cartaoCode: '7',
  });
  expect(post).toHaveBeenCalledWith('v1/cartao-resposta/historico', {
    usuario: 'u1',
    imageKey: 'cartoes/665/i.jpg',
    cartaoCode: '7',
  });
  expect(r).toEqual({ historicoId: 'h1' });
});
