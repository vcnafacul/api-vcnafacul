import { CartaoRespostaController } from './cartao-resposta.controller';

it('GET :simuladoId seta Content-Type e envia o buffer', async () => {
  const service = {
    baixarCartao: jest.fn().mockResolvedValue({
      buffer: Buffer.from('PDF'),
      contentType: 'application/pdf',
    }),
  };
  const res: any = { setHeader: jest.fn(), send: jest.fn() };
  const controller = new CartaoRespostaController(service as any);
  await controller.baixarCartao('665abc', res);
  expect(service.baixarCartao).toHaveBeenCalledWith('665abc');
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  expect(res.send).toHaveBeenCalledWith(Buffer.from('PDF'));
});
