import { CartaoRespostaController } from './cartao-resposta.controller';

it('GET :simuladoId seta Content-Type e envia o buffer', async () => {
  const service = {
    baixarCartao: jest.fn().mockResolvedValue({
      buffer: Buffer.from('PDF'),
      contentType: 'application/pdf',
    }),
  };
  const res: any = { setHeader: jest.fn(), send: jest.fn() };
  const resultadosService = { buscarPorMatricula: jest.fn() };
  const uploadService = { processar: jest.fn() };
  const controller = new CartaoRespostaController(
    service as any,
    resultadosService as any,
    uploadService as any,
    { processar: jest.fn() } as any,
  );
  await controller.baixarCartao('665abc', res);
  expect(service.baixarCartao).toHaveBeenCalledWith('665abc');
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  expect(res.send).toHaveBeenCalledWith(Buffer.from('PDF'));
});

it('GET resultados delega ao service com userId + matricula', async () => {
  const httpServiceMock = { baixarCartao: jest.fn() };
  const resultadosService = {
    buscarPorMatricula: jest
      .fn()
      .mockResolvedValue({ estudante: {}, historicos: [] }),
  };
  const uploadService = { processar: jest.fn() };
  const controller = new CartaoRespostaController(
    httpServiceMock as any,
    resultadosService as any,
    uploadService as any,
    { processar: jest.fn() } as any,
  );
  const req: any = { user: { id: 'u-colab' } };
  const r = await controller.resultadosPorMatricula('MAT1', req);
  expect(resultadosService.buscarPorMatricula).toHaveBeenCalledWith(
    'u-colab',
    'MAT1',
  );
  expect(r).toEqual({ estudante: {}, historicos: [] });
});

it('POST upload delega ao CartaoUploadService', async () => {
  const httpServiceMock = { baixarCartao: jest.fn() };
  const resultadosMock = { buscarPorMatricula: jest.fn() };
  const uploadService = {
    processar: jest.fn().mockResolvedValue({ historicoId: 'h1' }),
  };
  const controller = new CartaoRespostaController(
    httpServiceMock as any,
    resultadosMock as any,
    uploadService as any,
    { processar: jest.fn() } as any,
  );
  const file: any = { buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' };
  const req: any = { user: { id: 'u-colab' } };
  const r = await controller.upload(file, 'u-aluno', req);
  expect(uploadService.processar).toHaveBeenCalledWith(
    'u-colab',
    'u-aluno',
    file,
  );
  expect(r).toEqual({ historicoId: 'h1' });
});

it('POST :historicoId/reprocessar delega com o userId do JWT e o arquivo', async () => {
  const reprocessoService = {
    processar: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new CartaoRespostaController(
    { baixarCartao: jest.fn() } as any,
    { buscarPorMatricula: jest.fn() } as any,
    { processar: jest.fn() } as any,
    reprocessoService as any,
  );
  const file: any = { buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' };
  const req: any = { user: { id: 'u-colab' } };

  await controller.reprocessar('h1', file, req);

  // ⚠️ o cursinho nunca vem do corpo: só o id de quem envia atravessa.
  expect(reprocessoService.processar).toHaveBeenCalledWith(
    'u-colab',
    'h1',
    file,
  );
});
