import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { RelatorioDaProvaController } from './relatorio-da-prova.controller';
import { RelatorioController } from './relatorio.controller';
import { RelatorioService } from './relatorio.service';

/**
 * As quatro rotas da prova (tickets/034) num app de verdade, montadas JUNTO
 * das do simulado — colisão de rota nasce no roteamento, e só um app a pega.
 */
describe('Relatório da prova — as rotas resolvem para o handler certo', () => {
  let app: INestApplication;

  const service = {
    consultar: jest.fn(),
    consultarQuestoes: jest.fn(),
    consultarProva: jest.fn(),
    consultarQuestoesDaProva: jest.fn(),
    listarSimulados: jest.fn(),
    consultarDetalhe: jest.fn(),
    serieDoEstudante: jest.fn(),
  };

  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'colab-1' };
      return true;
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [RelatorioController, RelatorioDaProvaController],
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
    service.consultarProva.mockResolvedValue({ linhas: [], resumo: {} });
    service.consultarQuestoesDaProva.mockResolvedValue({ questoes: [] });
  });

  it('o geral da prova cai no consultarProva', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/prova/p-1')
      .expect(200);

    expect(service.consultarProva).toHaveBeenCalledWith('colab-1', 'p-1');
    expect(service.consultar).not.toHaveBeenCalled();
  });

  it('`/questoes` NÃO é tratado como um provaId', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/prova/p-1/questoes')
      .expect(200);

    expect(service.consultarQuestoesDaProva).toHaveBeenCalledWith(
      'colab-1',
      'p-1',
    );
    expect(service.consultarProva).not.toHaveBeenCalled();
  });

  it('por turma', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/prova/p-1/turma/t-1')
      .expect(200);

    expect(service.consultarProva).toHaveBeenCalledWith(
      'colab-1',
      'p-1',
      't-1',
    );
  });

  it('questões por turma', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/prova/p-1/turma/t-1/questoes')
      .expect(200);

    expect(service.consultarQuestoesDaProva).toHaveBeenCalledWith(
      'colab-1',
      'p-1',
      't-1',
    );
    expect(service.consultarProva).not.toHaveBeenCalled();
  });

  it('a rota do simulado continua indo para o handler dela', async () => {
    service.consultar.mockResolvedValue({ linhas: [], resumo: {} });
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1')
      .expect(200);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1');
    expect(service.consultarProva).not.toHaveBeenCalled();
  });
});
