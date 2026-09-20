jest.mock('./qr-decoder');
// ⚠️ **Contador, não constante.** O spec do `cartao-upload.service` mocka
// `v4: () => 'IMGID'` — com ele, o teste de "duas chamadas geram chaves
// diferentes" passaria a ser impossível de satisfazer. Aqui a chave PRECISA
// mudar a cada tentativa, que é a decisão central do card.
jest.mock('uuid', () => {
  let n = 0;
  return { v4: () => `uuid-${++n}` };
});
import { decodeCartaoQr } from './qr-decoder';
import { CartaoReprocessoService } from './cartao-reprocesso.service';

const montar = (over: any = {}) => {
  const blobService = { putObjectAtKey: jest.fn() };
  const omrCache = { primeImagem: jest.fn() };
  const cartaoHttp = { reprocessar: over.reprocessar ?? jest.fn() };
  const env = { get: jest.fn().mockReturnValue('bucket-cartao') };
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
  };
  const svc = new CartaoReprocessoService(
    blobService as any,
    omrCache as any,
    cartaoHttp as any,
    env as any,
    cursinhoResolver as any,
  );
  return { svc, blobService, omrCache, cartaoHttp, cursinhoResolver };
};

const arquivo = { buffer: Buffer.from('foto'), mimetype: 'image/jpeg' } as any;

describe('CartaoReprocessoService (api)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (decodeCartaoQr as jest.Mock).mockResolvedValue({
      simuladoId: 'sim-1',
      cartaoCode: '7',
    });
  });

  it('⚠️ cunha uma imageKey NOVA — nunca reusa a do histórico', async () => {
    // Chave inédita nunca esteve no cache do OMR, então não há foto velha a
    // servir. É o que dissolve o risco 1 do card.
    const { svc, blobService } = montar();

    await svc.processar('colab-1', 'h1', arquivo);

    const [, , key] = blobService.putObjectAtKey.mock.calls[0];
    expect(key).toMatch(/^cartoes\/sim-1\/uuid-\d+\.jpg$/);
  });

  it('⚠️ duas chamadas geram chaves DIFERENTES', async () => {
    const { svc, blobService } = montar();

    await svc.processar('colab-1', 'h1', arquivo);
    await svc.processar('colab-1', 'h1', arquivo);

    const k1 = blobService.putObjectAtKey.mock.calls[0][2];
    const k2 = blobService.putObjectAtKey.mock.calls[1][2];
    expect(k1).not.toBe(k2);
  });

  it('⚠️ bucket ANTES do cache, e o ms por último', async () => {
    // Se o cache falhar, o OMR busca do bucket, que já tem a foto certa.
    // Invertido, o cache vira a fonte da verdade por até uma hora.
    const ordem: string[] = [];
    const { svc, blobService, omrCache, cartaoHttp } = montar();
    blobService.putObjectAtKey.mockImplementation(async () => {
      ordem.push('bucket');
    });
    omrCache.primeImagem.mockImplementation(async () => {
      ordem.push('cache');
    });
    cartaoHttp.reprocessar.mockImplementation(async () => {
      ordem.push('ms');
    });

    await svc.processar('colab-1', 'h1', arquivo);

    expect(ordem).toEqual(['bucket', 'cache', 'ms']);
  });

  it('a chave gravada no bucket é a MESMA que vai ao cache e ao ms', async () => {
    // Sem isto, os testes acima passariam com três chaves diferentes.
    const { svc, blobService, omrCache, cartaoHttp } = montar();

    await svc.processar('colab-1', 'h1', arquivo);

    const key = blobService.putObjectAtKey.mock.calls[0][2];
    expect(omrCache.primeImagem).toHaveBeenCalledWith(key, arquivo.buffer);
    expect(cartaoHttp.reprocessar).toHaveBeenCalledWith(
      'h1',
      expect.objectContaining({ imageKey: key }),
    );
  });

  it('manda o QR decodificado ao ms, para ele conferir', async () => {
    const { svc, cartaoHttp } = montar();

    await svc.processar('colab-1', 'h1', arquivo);

    expect(cartaoHttp.reprocessar).toHaveBeenCalledWith(
      'h1',
      expect.objectContaining({
        cursinhoId: 'cur-1',
        simuladoId: 'sim-1',
        cartaoCode: '7',
      }),
    );
  });

  it('sem arquivo, chama o ms sem imageKey e não toca no bucket', async () => {
    const { svc, blobService, cartaoHttp } = montar();

    await svc.processar('colab-1', 'h1', undefined);

    expect(blobService.putObjectAtKey).not.toHaveBeenCalled();
    expect(cartaoHttp.reprocessar).toHaveBeenCalledWith('h1', {
      cursinhoId: 'cur-1',
    });
  });

  it('⚠️ o cursinho vem do JWT, nunca do corpo', async () => {
    const { svc, cursinhoResolver } = montar();

    await svc.processar('colab-1', 'h1', arquivo);

    expect(cursinhoResolver.resolveCursinhoIdByUserId).toHaveBeenCalledWith(
      'colab-1',
    );
  });

  it('QR ilegível: não sobe nada e não chama o ms', async () => {
    (decodeCartaoQr as jest.Mock).mockRejectedValue(new Error('QR ilegível'));
    const { svc, blobService, cartaoHttp } = montar();

    await expect(svc.processar('colab-1', 'h1', arquivo)).rejects.toThrow(
      'QR ilegível',
    );

    expect(blobService.putObjectAtKey).not.toHaveBeenCalled();
    expect(cartaoHttp.reprocessar).not.toHaveBeenCalled();
  });

  it('⚠️ recusa do ms: propaga o erro E LOGA a imagem órfã no bucket', async () => {
    // O bucket é escrito ANTES da chamada ao ms, então uma recusa (QR de
    // outro cartão, janela do rate limit) deixa o arquivo lá. É um trade
    // assumido — mas tem de deixar rastro, senão vira crescimento silencioso.
    const recusa = new Error('cartão de outro simulado');
    const { svc, blobService } = montar({
      reprocessar: jest.fn().mockRejectedValue(recusa),
    });
    const warn = jest
      .spyOn(
        (svc as unknown as { logger: { warn: (m: string) => void } }).logger,
        'warn',
      )
      .mockImplementation(() => undefined);

    await expect(svc.processar('colab-1', 'h1', arquivo)).rejects.toBe(recusa);

    const key = blobService.putObjectAtKey.mock.calls[0][2];
    expect(warn).toHaveBeenCalledTimes(1);
    const mensagem = String(warn.mock.calls[0][0]);
    expect(mensagem).toContain(key);
    expect(mensagem).toContain('h1');
  });
});
