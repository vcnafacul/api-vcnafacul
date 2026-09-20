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

/**
 * O plano deste card supunha um `montar()` já existente neste arquivo — não
 * havia: cada teste acima monta os seus próprios dublês inline. Este helper
 * nasce aqui de forma **aditiva**, para os testes do `reprocessar`, sem
 * reescrever nenhum dos anteriores.
 */
function montar() {
  const axios = {
    getBinary: jest.fn(),
    get: jest.fn(),
    post: jest.fn().mockResolvedValue(undefined),
  };
  const factory = { create: jest.fn().mockReturnValue(axios) } as any;
  const env = { get: jest.fn().mockReturnValue('http://ms:3000') } as any;
  return { svc: new CartaoRespostaHttpService(factory, env), axios };
}

it('reprocessar manda o cursinho e o QR no CORPO, não no caminho', async () => {
  // ⚠️ Um path param cru já deixou o chamador reescrever a URL do ms — um
  // `?` embutido sobrepunha o cursinhoId do JWT. O `historicoId` vai no
  // caminho e é encodado; o resto vai no corpo.
  const { svc, axios } = montar();

  await svc.reprocessar('h1', {
    cursinhoId: 'cur-1',
    imageKey: 'cartoes/abc/nova.jpg',
    simuladoId: 'abc',
    cartaoCode: '7',
  });

  expect(axios.post).toHaveBeenCalledWith(
    'v1/cartao-resposta/h1/reprocessar',
    expect.objectContaining({ cursinhoId: 'cur-1', cartaoCode: '7' }),
  );
});

it('⚠️ historicoId vai encodado', async () => {
  const { svc, axios } = montar();

  await svc.reprocessar('h1?x=1', { cursinhoId: 'cur-1' });

  const url = axios.post.mock.calls[0][0] as string;
  expect(url.split('?')).toHaveLength(1);
});
