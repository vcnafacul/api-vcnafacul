import { NotFoundException } from '@nestjs/common';
import { CartaoExclusaoService } from './cartao-exclusao.service';

const montar = (over: any = {}) => {
  const blobService = {
    deleteFile: over.deleteFile ?? jest.fn().mockResolvedValue(undefined),
  };
  const cartaoHttp = {
    excluir:
      over.excluir ??
      jest.fn().mockResolvedValue({
        imageKey: 'cartoes/s1/foto.jpg',
        usuario: 'u-errado',
        simuladoId: 's1',
      }),
  };
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
  };
  const pushResultado = {
    ignorarDoHistorico:
      over.ignorarDoHistorico ?? jest.fn().mockResolvedValue(undefined),
  };
  const env = { get: jest.fn().mockReturnValue('bucket-cartao') };
  const svc = new CartaoExclusaoService(
    blobService as any,
    cartaoHttp as any,
    cursinhoResolver as any,
    pushResultado as any,
    env as any,
  );
  return { svc, blobService, cartaoHttp, cursinhoResolver, pushResultado };
};

describe('CartaoExclusaoService (api, card 36)', () => {
  it('pede ao ms com o cursinho do JWT e o autor; tira o push e apaga a foto', async () => {
    const m = montar();

    await m.svc.excluir('colab-1', 'h1');

    expect(m.cursinhoResolver.resolveCursinhoIdByUserId).toHaveBeenCalledWith(
      'colab-1',
    );
    expect(m.cartaoHttp.excluir).toHaveBeenCalledWith('h1', {
      cursinhoId: 'cur-1',
      excluidoPor: 'colab-1',
    });
    expect(m.pushResultado.ignorarDoHistorico).toHaveBeenCalledWith('h1');
    expect(m.blobService.deleteFile).toHaveBeenCalledWith(
      'cartoes/s1/foto.jpg',
      'bucket-cartao',
    );
  });

  it('⚠️ ms recusa (404/409): nada é tocado aqui, e o erro sobe como veio', async () => {
    const erro = new NotFoundException('cartão não encontrado neste cursinho');
    const m = montar({ excluir: jest.fn().mockRejectedValue(erro) });

    await expect(m.svc.excluir('colab-1', 'h1')).rejects.toBe(erro);
    expect(m.pushResultado.ignorarDoHistorico).not.toHaveBeenCalled();
    expect(m.blobService.deleteFile).not.toHaveBeenCalled();
  });

  it('⚠️ falha ao apagar a foto ou o push NÃO derruba a exclusão', async () => {
    const m = montar({
      deleteFile: jest.fn().mockRejectedValue(new Error('NoSuchKey')),
      ignorarDoHistorico: jest.fn().mockRejectedValue(new Error('db')),
    });

    await expect(m.svc.excluir('colab-1', 'h1')).resolves.toBeUndefined();
  });

  it('exclusão retomada (ms sem imageKey): não chama o bucket', async () => {
    const m = montar({
      excluir: jest
        .fn()
        .mockResolvedValue({ imageKey: null, usuario: 'u', simuladoId: null }),
    });

    await m.svc.excluir('colab-1', 'h1');

    expect(m.blobService.deleteFile).not.toHaveBeenCalled();
    expect(m.pushResultado.ignorarDoHistorico).toHaveBeenCalledWith('h1');
  });
});
