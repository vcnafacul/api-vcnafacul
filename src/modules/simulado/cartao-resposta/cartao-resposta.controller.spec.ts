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
  );
  const file: any = { buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' };
  const r = await controller.upload(file, 'u-aluno');
  expect(uploadService.processar).toHaveBeenCalledWith('u-aluno', file);
  expect(r).toEqual({ historicoId: 'h1' });
});
