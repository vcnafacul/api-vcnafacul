import {
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ControllerExceptionsFilter } from 'src/exceptions/controller.filter';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { AtorService } from './ator/ator.service';
import { CadernoHttpService } from './caderno/caderno-http.service';
import { ProvaController } from './prova/prova.controller';
import { ProvaService } from './prova/prova.service';
import { QuestaoController } from './questao/questao.controller';
import { QuestaoService } from './questao/questao.service';

/**
 * tickets/042, card 06 — as rotas de anulação no gateway, num app de verdade
 * (pipe e filtro globais como no `main.ts`), e os 409 com corpo.
 */
describe('anulação no gateway (042/06)', () => {
  let app: INestApplication;
  const PROVA = '65ecc850a528b39d273e7900';
  const QUESTAO = '65ecc850a528b39d273e7901';
  const ATOR = {
    userId: 'u',
    cursinhoId: 'c1',
    admin: false,
    editorCursinho: true,
  };
  const provaService = {
    anularQuestao: jest.fn().mockResolvedValue({ acao: 'anular' }),
    desanularQuestao: jest.fn().mockResolvedValue({ acao: 'desanular' }),
    getProvaById: jest.fn(),
  };
  const questaoService = {
    anulacoes: jest.fn().mockResolvedValue([{ provaId: PROVA }]),
    adicionarEmProva: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn(),
  };
  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'u' };
      return true;
    },
  };
  const corpo = {
    motivo: 'sem_alternativa_correta',
    justificativa: 'A alternativa C, dada como gabarito, está errada.',
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ProvaController, QuestaoController],
      providers: [
        { provide: ProvaService, useValue: provaService },
        { provide: QuestaoService, useValue: questaoService },
        {
          provide: AtorService,
          useValue: { resolver: jest.fn().mockResolvedValue(ATOR) },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passaTudo)
      .overrideGuard(PermissionsGuard)
      .useValue(passaTudo)
      .compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    );
    app.useGlobalFilters(new ControllerExceptionsFilter());
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  const url = `/mssimulado/prova/${PROVA}/questoes/${QUESTAO}/anulacao`;

  it('PUT anula com o ator do JWT; DELETE desanula', async () => {
    await request(app.getHttpServer()).put(url).send(corpo).expect(200);
    expect(provaService.anularQuestao).toHaveBeenCalledWith(
      PROVA,
      QUESTAO,
      expect.objectContaining(corpo),
      ATOR,
    );
    await request(app.getHttpServer()).delete(url).expect(200);
    expect(provaService.desanularQuestao).toHaveBeenCalledWith(
      PROVA,
      QUESTAO,
      ATOR,
    );
  });

  it('justificativa curta / motivo fora do enum → 400, sem chamar o ms', async () => {
    for (const ruim of [
      { motivo: 'outro', justificativa: '  curta ' },
      { motivo: 'nao-existe', justificativa: corpo.justificativa },
      { motivo: 'outro' },
    ]) {
      await request(app.getHttpServer()).put(url).send(ruim).expect(400);
    }
    expect(provaService.anularQuestao).not.toHaveBeenCalled();
  });

  it('o 403 do ms (prova de outro cursinho) chega como 403', async () => {
    provaService.anularQuestao.mockRejectedValueOnce(
      new HttpException(
        { message: 'Esta prova pertence a outro cursinho.' },
        403,
      ),
    );
    const r = await request(app.getHttpServer())
      .put(url)
      .send(corpo)
      .expect(403);
    expect(r.body.message).toBe('Esta prova pertence a outro cursinho.');
  });

  it('⚠️ sem login → 401: as rotas de anulação têm o JwtAuthGuard', () => {
    for (const metodo of ['anularQuestao', 'desanularQuestao']) {
      const guards = Reflect.getMetadata(
        '__guards__',
        (ProvaController.prototype as any)[metodo],
      );
      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, PermissionsGuard]),
      );
    }
  });

  it('id malformado não casa a rota', async () => {
    await request(app.getHttpServer())
      .put(`/mssimulado/prova/abc/questoes/${QUESTAO}/anulacao`)
      .send(corpo)
      .expect(404);
  });

  it('GET questões/:id/anulacoes cai no handler certo', async () => {
    await request(app.getHttpServer())
      .get(`/mssimulado/questoes/${QUESTAO}/anulacoes`)
      .expect(200);
    expect(questaoService.anulacoes).toHaveBeenCalledWith(QUESTAO);
    expect(questaoService.getById).not.toHaveBeenCalled();
  });

  it('adicionar à prova repassa `modo` e `anulacao`; modo inválido → 400', async () => {
    const r = `/mssimulado/questoes/${QUESTAO}/provas`;
    await request(app.getHttpServer())
      .post(r)
      .send({ provaId: PROVA, numero: 12, modo: 'anulada', anulacao: corpo })
      .expect(201);
    expect(questaoService.adicionarEmProva).toHaveBeenCalledWith(
      QUESTAO,
      expect.objectContaining({
        modo: 'anulada',
        anulacao: expect.objectContaining(corpo),
      }),
      ATOR,
    );
    await request(app.getHttpServer())
      .post(r)
      .send({ provaId: PROVA, numero: 12, modo: 'outro' })
      .expect(400);
  });

  it('⚠️ o 409 QUESTAO_ANULADA chega ao client com o corpo (code + anulacoes)', async () => {
    const anulacoes = [
      { provaNome: 'ENEM 2022', numero: 45, justificativa: 'x' },
    ];
    questaoService.adicionarEmProva.mockRejectedValueOnce(
      new HttpException(
        { code: 'QUESTAO_ANULADA', message: 'anulada', anulacoes },
        409,
      ),
    );
    const res = await request(app.getHttpServer())
      .post(`/mssimulado/questoes/${QUESTAO}/provas`)
      .send({ provaId: PROVA, numero: 12 })
      .expect(409);
    expect(res.body).toMatchObject({
      code: 'QUESTAO_ANULADA',
      anulacoes,
      statusCode: 409,
    });
  });
});

describe('caderno: confirmarAnuladas na chamada ao ms (042/06)', () => {
  const montar = () => {
    const axios = {
      postBinary: jest.fn().mockResolvedValue({
        buffer: Buffer.from(''),
        contentType: '',
        headers: {},
      }),
    };
    return {
      service: new CadernoHttpService(
        { create: () => axios } as any,
        { get: () => 'http://ms' } as any,
      ),
      axios,
    };
  };
  const ID = '65ecc850a528b39d273e7900';

  it.each([
    [false, false, `v1/caderno/${ID}`],
    [true, false, `v1/caderno/${ID}?draft=true`],
    [false, true, `v1/caderno/${ID}?confirmarAnuladas=true`],
    [true, true, `v1/caderno/${ID}?draft=true&confirmarAnuladas=true`],
  ])('draft=%s confirmar=%s → %s', async (draft, confirmar, rota) => {
    const { service, axios } = montar();
    await service.baixar(ID, draft, {}, confirmar);
    expect(axios.postBinary.mock.calls[0][0]).toBe(rota);
  });

  it('caderno da prova', async () => {
    const { service, axios } = montar();
    await service.baixarDaProva(ID, {}, true);
    expect(axios.postBinary.mock.calls[0][0]).toBe(
      `v1/caderno/prova/${ID}?confirmarAnuladas=true`,
    );
  });
});
