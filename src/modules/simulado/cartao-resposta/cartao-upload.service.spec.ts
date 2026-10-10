jest.mock('./qr-decoder');
jest.mock('uuid', () => ({ v4: () => 'IMGID' }));
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { prepararFotoDoCartao } from './qr-decoder';
import { CartaoUploadService } from './cartao-upload.service';

function setup(over: any = {}) {
  const blob = { putObjectAtKey: jest.fn().mockResolvedValue(undefined) };
  const omrCache = { primeImagem: jest.fn().mockResolvedValue(undefined) };
  const cartaoHttp = {
    criarHistorico: jest.fn().mockResolvedValue({ historicoId: 'h1' }),
  };
  const env = { get: jest.fn().mockReturnValue('vcnafacul-cartoes') };
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
    ...over.cursinhoResolver,
  };
  const studentCourseRepository = {
    findByUserIdAndPrepCourse: jest
      .fn()
      .mockResolvedValue({ id: 's1', class: { id: 't-1' } }),
    ...over.studentCourseRepository,
  };
  return {
    svc: new CartaoUploadService(
      blob as any,
      omrCache as any,
      cartaoHttp as any,
      env as any,
      cursinhoResolver as any,
      studentCourseRepository as any,
    ),
    blob,
    omrCache,
    cartaoHttp,
    cursinhoResolver,
    studentCourseRepository,
  };
}

it('happy: decode→R2→cache→A3', async () => {
  (prepararFotoDoCartao as jest.Mock).mockImplementation(
    async (buffer: Buffer, mimetype?: string) => ({
      simuladoId: '665',
      cartaoCode: '7',
      buffer,
      contentType: mimetype ?? 'image/jpeg',
      rotacao: 0,
    }),
  );
  const { svc, blob, omrCache, cartaoHttp } = setup();
  const file: any = { buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' };
  const r = await svc.processar('u-colab', 'u-aluno', file);
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
    cursinhoId: 'cur-1',
    turmaId: 't-1',
  });
  expect(r).toEqual({ historicoId: 'h1' });
});

it('QR ilegível: não sobe nem chama A3', async () => {
  (prepararFotoDoCartao as jest.Mock).mockRejectedValue(
    new Error('QR ilegível'),
  );
  const { svc, blob, cartaoHttp } = setup();
  await expect(
    svc.processar('u-colab', 'u', { buffer: Buffer.from('X') } as any),
  ).rejects.toThrow();
  expect(blob.putObjectAtKey).not.toHaveBeenCalled();
  expect(cartaoHttp.criarHistorico).not.toHaveBeenCalled();
});

it('sem arquivo: 400 sem decodificar/subir', async () => {
  const { svc, blob, cartaoHttp } = setup();
  await expect(
    svc.processar('u-colab', 'u', undefined as any),
  ).rejects.toBeInstanceOf(BadRequestException);
  expect(blob.putObjectAtKey).not.toHaveBeenCalled();
  expect(cartaoHttp.criarHistorico).not.toHaveBeenCalled();
});

it('repassa cursinho e turma do instante do envio', async () => {
  (prepararFotoDoCartao as jest.Mock).mockImplementation(
    async (buffer: Buffer, mimetype?: string) => ({
      simuladoId: '665',
      cartaoCode: '7',
      buffer,
      contentType: mimetype ?? 'image/jpeg',
      rotacao: 0,
    }),
  );
  const { svc, cartaoHttp } = setup();
  const file: any = { buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' };

  await svc.processar('u-colab', 'u-aluno', file);

  expect(cartaoHttp.criarHistorico).toHaveBeenCalledWith(
    expect.objectContaining({
      usuario: 'u-aluno',
      cursinhoId: 'cur-1',
      turmaId: 't-1',
    }),
  );
});

it('estudante sem turma vai sem turmaId, e o upload segue', async () => {
  (prepararFotoDoCartao as jest.Mock).mockImplementation(
    async (buffer: Buffer, mimetype?: string) => ({
      simuladoId: '665',
      cartaoCode: '7',
      buffer,
      contentType: mimetype ?? 'image/jpeg',
      rotacao: 0,
    }),
  );
  const { svc, cartaoHttp } = setup({
    studentCourseRepository: {
      findByUserIdAndPrepCourse: jest.fn().mockResolvedValue({ id: 's1' }),
    },
  });
  const file: any = { buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' };

  await svc.processar('u-colab', 'u-aluno', file);

  expect(cartaoHttp.criarHistorico).toHaveBeenCalledWith(
    expect.objectContaining({ cursinhoId: 'cur-1', turmaId: undefined }),
  );
});

it('recusa cartão de estudante que não é do cursinho de quem envia', async () => {
  (prepararFotoDoCartao as jest.Mock).mockImplementation(
    async (buffer: Buffer, mimetype?: string) => ({
      simuladoId: '665',
      cartaoCode: '7',
      buffer,
      contentType: mimetype ?? 'image/jpeg',
      rotacao: 0,
    }),
  );
  const { svc, cartaoHttp, blob } = setup({
    studentCourseRepository: {
      findByUserIdAndPrepCourse: jest.fn().mockResolvedValue(null),
    },
  });
  const file: any = { buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' };

  await expect(
    svc.processar('u-colab', 'u-de-outro-cursinho', file),
  ).rejects.toThrow(
    new ForbiddenException('Este estudante não é do seu cursinho.'),
  );

  // recusa ANTES de subir o arquivo: nada de lixo no bucket
  expect(blob.putObjectAtKey).not.toHaveBeenCalled();
  expect(cartaoHttp.criarHistorico).not.toHaveBeenCalled();
});

it('⚠️ tickets/037: guarda e põe no cache a foto EM PÉ, não a enviada', async () => {
  const emPe = Buffer.from('FOTO-EM-PE');
  (prepararFotoDoCartao as jest.Mock).mockResolvedValue({
    simuladoId: '665',
    cartaoCode: '7',
    buffer: emPe,
    contentType: 'image/jpeg',
    rotacao: 270,
  });
  const { svc, blob, omrCache } = setup();
  const file: any = {
    buffer: Buffer.from('FOTO-DEITADA'),
    mimetype: 'image/png',
  };

  await svc.processar('u-colab', 'u', file);

  expect(prepararFotoDoCartao).toHaveBeenCalledWith(file.buffer, 'image/png');
  const [buffer, , key, contentType] = blob.putObjectAtKey.mock.calls[0];
  expect(buffer).toBe(emPe);
  expect(contentType).toBe('image/jpeg');
  expect(omrCache.primeImagem).toHaveBeenCalledWith(key, emPe);
});
