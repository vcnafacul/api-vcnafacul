import { readFileSync } from 'fs';
import { join } from 'path';
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

describe('GET buscar-estudantes', () => {
  const montar = (buscarEstudantes = jest.fn()) => {
    const resultadosService = {
      buscarPorMatricula: jest.fn(),
      buscarEstudantes,
    };
    const controller = new CartaoRespostaController(
      { baixarCartao: jest.fn() } as any,
      resultadosService as any,
      { processar: jest.fn() } as any,
      { processar: jest.fn() } as any,
    );
    return { controller, resultadosService };
  };

  it('⚠️ delega passando o userId do JWT, e nao um id da requisicao', async () => {
    // E o gate de cursinho: o servico resolve o cursinho a partir DESTE id.
    const { controller, resultadosService } = montar(
      jest.fn().mockResolvedValue({ estudantes: [] }),
    );

    await controller.buscarEstudantes('Ana', {
      user: { id: 'colab-9' },
    } as any);

    expect(resultadosService.buscarEstudantes).toHaveBeenCalledWith(
      'colab-9',
      'Ana',
    );
  });

  it('devolve o que o servico devolveu', async () => {
    const payload = { estudantes: [{ userId: 'u1' }] };
    const { controller } = montar(jest.fn().mockResolvedValue(payload));

    const r = await controller.buscarEstudantes('Ana', {
      user: { id: 'c' },
    } as any);

    expect(r).toBe(payload);
  });
});

describe('⚠️ ordem das rotas GET no controller', () => {
  /**
   * O Nest casa rotas na ORDEM DE DECLARACAO. `buscar-estudantes` e
   * `resultados` declaradas depois de `:simuladoId` seriam capturadas como um
   * id, e as duas rotas nunca executariam — um 200 com corpo errado, nao um
   * 404, que e o que torna esta classe de defeito dificil de ver.
   *
   * Nenhum teste de unidade de controller pega isso, porque o metodo existe e
   * responde quando chamado direto. Por isso a assercao e sobre o ARQUIVO.
   */
  it('as rotas literais vem ANTES da rota com parametro', () => {
    const fonte = readFileSync(
      join(__dirname, 'cartao-resposta.controller.ts'),
      'utf8',
    );

    // ⚠️ Regex ancorada no inicio da linha, e nao `indexOf`: o docblock da
    // rota MENCIONA `@Get(':simuladoId')` para explicar a ordem, e um
    // `indexOf` casaria com o comentario — dando a posicao errada e um teste
    // vermelho com o codigo certo. Foi o que aconteceu ao escrever isto.
    const posDe = (rota: string) =>
      fonte.search(new RegExp(`^\\s*@Get\\('${rota}'\\)`, 'm'));

    const posBuscar = posDe('buscar-estudantes');
    const posResultados = posDe('resultados');
    const posParam = posDe(':simuladoId');

    expect(posBuscar).toBeGreaterThan(-1);
    expect(posParam).toBeGreaterThan(-1);
    expect(posBuscar).toBeLessThan(posParam);
    expect(posResultados).toBeLessThan(posParam);
  });
});
