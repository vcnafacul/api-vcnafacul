jest.mock('./qr-decoder');
jest.mock('uuid', () => ({ v4: () => 'IMGID' }));
import { decodeCartaoQr } from './qr-decoder';
import { CartaoUploadService } from './cartao-upload.service';

function setup() {
  const blob = { putObjectAtKey: jest.fn().mockResolvedValue(undefined) };
  const omrCache = { primeImagem: jest.fn().mockResolvedValue(undefined) };
  const cartaoHttp = {
    criarHistorico: jest.fn().mockResolvedValue({ historicoId: 'h1' }),
  };
  const env = { get: jest.fn().mockReturnValue('vcnafacul-cartoes') };
  return {
    svc: new CartaoUploadService(
      blob as any,
      omrCache as any,
      cartaoHttp as any,
      env as any,
    ),
    blob,
    omrCache,
    cartaoHttp,
  };
}

it('happy: decode→R2→cache→A3', async () => {
  (decodeCartaoQr as jest.Mock).mockResolvedValue({
    simuladoId: '665',
    cartaoCode: '7',
  });
  const { svc, blob, omrCache, cartaoHttp } = setup();
  const file: any = { buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' };
  const r = await svc.processar('u-aluno', file);
  const imageKey = 'cartoes/665/IMGID.jpg';
  expect(blob.putObjectAtKey).toHaveBeenCalledWith(
    file.buffer,
    'vcnafacul-cartoes',
    imageKey,
    'image/jpeg',
  );
  expect(omrCache.primeImagem).toHaveBeenCalledWith(imageKey, file.buffer);
  expect(cartaoHttp.criarHistorico).toHaveBeenCalledWith({
    usuario: 'u-aluno',
    imageKey,
    cartaoCode: '7',
  });
  expect(r).toEqual({ historicoId: 'h1' });
});

it('QR ilegível: não sobe nem chama A3', async () => {
  (decodeCartaoQr as jest.Mock).mockRejectedValue(new Error('QR ilegível'));
  const { svc, blob, cartaoHttp } = setup();
  await expect(
    svc.processar('u', { buffer: Buffer.from('X') } as any),
  ).rejects.toThrow();
  expect(blob.putObjectAtKey).not.toHaveBeenCalled();
  expect(cartaoHttp.criarHistorico).not.toHaveBeenCalled();
});
