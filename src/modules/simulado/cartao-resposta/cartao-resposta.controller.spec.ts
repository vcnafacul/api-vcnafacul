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
  const controller = new CartaoRespostaController(
    service as any,
    resultadosService as any,
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
  const controller = new CartaoRespostaController(
    httpServiceMock as any,
    resultadosService as any,
  );
  const req: any = { user: { id: 'u-colab' } };
  const r = await controller.resultadosPorMatricula('MAT1', req);
  expect(resultadosService.buscarPorMatricula).toHaveBeenCalledWith(
    'u-colab',
    'MAT1',
  );
  expect(r).toEqual({ estudante: {}, historicos: [] });
});
