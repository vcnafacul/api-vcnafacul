import { HttpException, HttpStatus } from '@nestjs/common';
import {
  CartaoImagemService,
  TTL_IMAGEM_DO_CARTAO_MS,
} from './cartao-imagem.service';

const CHAVE = 'cartoes/s1/abc.jpg';

const montar = (over: { localizar?: jest.Mock } = {}) => {
  // Um cache de verdade em memória: é o `wrap` que decide quem vai ao bucket.
  const guardado = new Map<string, unknown>();
  const cache = {
    wrap: jest.fn(
      async (chave: string, fn: () => Promise<unknown>, ttl: number) => {
        if (guardado.has(chave)) return guardado.get(chave);
        const v = await fn();
        guardado.set(chave, v);
        cache.ttls.push(ttl);
        return v;
      },
    ),
    ttls: [] as number[],
  };
  const blobService = {
    getFile: jest.fn().mockResolvedValue({
      buffer: Buffer.from('FOTO').toString('base64'),
      contentType: 'image/jpeg',
    }),
  };
  const cartaoHttp = {
    localizarImagem:
      over.localizar ?? jest.fn().mockResolvedValue({ imageKey: CHAVE }),
  };
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
  };
  const env = { get: jest.fn().mockReturnValue('bucket-cartao') };
  const svc = new CartaoImagemService(
    blobService as any,
    cartaoHttp as any,
    cursinhoResolver as any,
    cache as any,
    env as any,
  );
  return { svc, cache, blobService, cartaoHttp, cursinhoResolver };
};

describe('CartaoImagemService', () => {
  it('pergunta ao ms com o cursinho do JWT e devolve a foto do bucket', async () => {
    const { svc, cartaoHttp, blobService } = montar();

    const r = await svc.baixar('u-colab', 'h1');

    expect(cartaoHttp.localizarImagem).toHaveBeenCalledWith('h1', {
      cursinhoId: 'cur-1',
    });
    expect(blobService.getFile).toHaveBeenCalledWith(CHAVE, 'bucket-cartao');
    expect(r).toEqual({
      buffer: Buffer.from('FOTO'),
      contentType: 'image/jpeg',
      nomeDoArquivo: 'abc.jpg',
    });
  });

  it('⚠️ cache de 10 minutos, pela imageKey: o segundo download não vai ao bucket', async () => {
    const { svc, cache, blobService } = montar();

    await svc.baixar('u-colab', 'h1');
    await svc.baixar('u-colab', 'h1');

    expect(blobService.getFile).toHaveBeenCalledTimes(1);
    expect(cache.wrap).toHaveBeenCalledWith(
      `cartao:imagem:${CHAVE}`,
      expect.any(Function),
      TTL_IMAGEM_DO_CARTAO_MS,
    );
    expect(TTL_IMAGEM_DO_CARTAO_MS).toBe(600_000);
  });

  it('⚠️ o gate roda a cada download — mesmo com a foto no cache', async () => {
    const { svc, cartaoHttp } = montar();

    await svc.baixar('u-colab', 'h1');
    await svc.baixar('u-colab', 'h1');

    expect(cartaoHttp.localizarImagem).toHaveBeenCalledTimes(2);
  });

  it('⚠️ ms recusa (outro cursinho ou sem foto): nem cache nem bucket', async () => {
    const recusa = new HttpException('não encontrado', HttpStatus.NOT_FOUND);
    const { svc, cache, blobService } = montar({
      localizar: jest.fn().mockRejectedValue(recusa),
    });

    await expect(svc.baixar('u-outro', 'h1')).rejects.toBe(recusa);
    expect(cache.wrap).not.toHaveBeenCalled();
    expect(blobService.getFile).not.toHaveBeenCalled();
  });
});
