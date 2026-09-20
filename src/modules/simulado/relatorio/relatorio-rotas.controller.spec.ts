import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { RelatorioController } from './relatorio.controller';
import { RelatorioService } from './relatorio.service';

/**
 * As sete rotas montadas num app de verdade.
 *
 * ⚠️ **Só um app pega isto.** `:simuladoId`, `:simuladoId/questoes`,
 * `:simuladoId/turma/:turmaId`, `:simuladoId/turma/:turmaId/questoes`,
 * `:simuladoId/estudante/:userId`, `simulados` e `simulados/turma/:turmaId`
 * convivem na mesma árvore, e um teste de unidade chama o método direto —
 * nunca exercita o roteamento.
 * As duas literais (`simulados*`) têm a MESMA contagem de segmentos que as
 * de `:simuladoId`, então a ordem de declaração é o que as salva. Este repositório já foi mordido por colisão literal ×
 * `:param` (ver `questao-rotas.controller.spec.ts`).
 */
describe('Relatório — as sete rotas resolvem para o handler certo', () => {
  let app: INestApplication;

  const service = {
    consultar: jest.fn(),
    consultarQuestoes: jest.fn(),
    listarSimulados: jest.fn(),
    consultarDetalhe: jest.fn(),
  };

  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'colab-1' };
      return true;
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [RelatorioController],
      providers: [{ provide: RelatorioService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passaTudo)
      .overrideGuard(PermissionsGuard)
      .useValue(passaTudo)
      .compile();

    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.consultar.mockResolvedValue({ linhas: [], resumo: {} });
    service.consultarQuestoes.mockResolvedValue({ questoes: [] });
    service.listarSimulados.mockResolvedValue({ simulados: [] });
    service.consultarDetalhe.mockResolvedValue({
      status: 'completed',
      respostas: [],
    });
  });

  it('o geral do cursinho cai no handler do geral', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1')
      .expect(200);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1');
    expect(service.consultarQuestoes).not.toHaveBeenCalled();
  });

  it('`/questoes` NÃO é tratado como um simuladoId', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1/questoes')
      .expect(200);

    expect(service.consultarQuestoes).toHaveBeenCalledWith('colab-1', 'sim-1');
    expect(service.consultar).not.toHaveBeenCalled();
  });

  it('a rota de turma cai no handler de turma', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1/turma/t-1')
      .expect(200);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1', 't-1');
  });

  it('`/turma/:id/questoes` não é engolida pela rota de turma', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1/turma/t-1/questoes')
      .expect(200);

    expect(service.consultarQuestoes).toHaveBeenCalledWith(
      'colab-1',
      'sim-1',
      't-1',
    );
    expect(service.consultar).not.toHaveBeenCalled();
  });

  it('GET /simulados resolve para a literal, não para :simuladoId', async () => {
    // mesma contagem de segmentos que `:simuladoId` — declarada depois, o
    // param a captura e o handler errado roda com simuladoId="simulados"
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/simulados')
      .expect(200);

    // exatamente um argumento: sem turma, e nada de cursinho vindo da URL
    expect(service.listarSimulados).toHaveBeenCalledWith('colab-1');
    expect(service.consultar).not.toHaveBeenCalled();
  });

  it('GET /simulados/turma/:turmaId resolve para a literal com turma', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/simulados/turma/t-1')
      .expect(200);

    expect(service.listarSimulados).toHaveBeenCalledWith('colab-1', 't-1');
    expect(service.consultar).not.toHaveBeenCalled();
  });

  it('GET :simuladoId/estudante/:userId resolve para o handler certo', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1/estudante/u1')
      .expect(200);

    expect(service.consultarDetalhe).toHaveBeenCalledWith(
      'colab-1',
      'sim-1',
      'u1',
    );
    expect(service.consultar).not.toHaveBeenCalled();
    expect(service.consultarQuestoes).not.toHaveBeenCalled();
  });

  it('`/estudante/:userId` não é engolido pela rota de turma nem vice-versa', async () => {
    // as duas têm três segmentos com literal no MEIO; se a de turma passasse a
    // ser `:simuladoId/:algo/:outro`, este par ficaria indistinguível
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1/turma/t-1')
      .expect(200);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1', 't-1');
    expect(service.consultarDetalhe).not.toHaveBeenCalled();
  });
});
