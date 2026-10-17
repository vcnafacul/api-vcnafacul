import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { EnvService } from 'src/shared/modules/env/env.service';
import { ControllerExceptionsFilter } from 'src/exceptions/controller.filter';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { RelatorioService } from '../relatorio/relatorio.service';
import { RelatorioController } from '../relatorio/relatorio.controller';
import { RelatorioDaProvaController } from '../relatorio/relatorio-da-prova.controller';
import { FimDoRecalculoController } from './fim-do-recalculo.controller';
import { FimDoRecalculoService } from './fim-do-recalculo.service';
import { FimDoRecalculoDtoInput } from './fim-do-recalculo.dto';

/** tickets/042, card 14. */
const JOB = '65ecc850a528b39d273e7900';
const HIST = (i: number) =>
  `65ecc850a528b39d273e${String(7000 + i).padStart(4, '0')}`;

describe('fim do recálculo → indicadores (042/14)', () => {
  const montar = (inseriu = true) => {
    const enqueueMany = jest.fn();
    const findTurmasDosUsuarios = jest.fn(async (users: string[]) =>
      users.map((u, i) => ({ userId: u, classId: `turma-${i % 4}` })),
    );
    const execute = jest
      .fn()
      .mockResolvedValue({ raw: { affectedRows: inseriu ? 1 : 0 } });
    const qb = {
      insert: () => qb,
      into: () => qb,
      values: jest.fn(() => qb),
      orIgnore: () => qb,
      execute,
    };
    const manager = {
      transaction: async (fn: any) => fn({ createQueryBuilder: () => qb }),
    };
    const registrar = jest.fn().mockResolvedValue(5);
    const svc = new FimDoRecalculoService(
      manager as never,
      { findTurmasDosUsuarios } as never,
      { enqueueMany } as never,
      { registrar } as never,
    );
    return { svc, enqueueMany, findTurmasDosUsuarios, qb, registrar };
  };
  const dto = (n: number): FimDoRecalculoDtoInput => ({
    jobId: JOB,
    provaNome: 'Prova X',
    simuladoIds: ['s'],
    numerosAnulados: [45],
    afetados: Array.from({ length: n }, (_, i) => ({
      usuario: `aluno-${i}`,
      historicoId: HIST(i),
      mes: i < n / 2 ? '2026-09' : '2026-10',
    })),
  });

  it('300 alunos em 4 turmas e 2 meses → 8 itens na fila, sem repetir', async () => {
    const { svc, enqueueMany } = montar();
    const r = await svc.receber(dto(300));
    expect(r).toEqual({ duplicado: false, enfileirados: 8, pushes: 5 });
    const itens = enqueueMany.mock.calls[0][0];
    expect(itens).toHaveLength(8);
    expect(new Set(itens.map((i: any) => `${i.classId}|${i.month}`)).size).toBe(
      8,
    );
    expect(itens.every((i: any) => i.type === 'simulado')).toBe(true);
  });

  it('callback repetido (mesmo jobId) não enfileira de novo', async () => {
    const { svc, enqueueMany, findTurmasDosUsuarios, registrar } =
      montar(false);
    expect(await svc.receber(dto(3))).toEqual({
      duplicado: true,
      enfileirados: 0,
      pushes: 0,
    });
    expect(enqueueMany).not.toHaveBeenCalled();
    expect(findTurmasDosUsuarios).not.toHaveBeenCalled();
    expect(registrar).not.toHaveBeenCalled();
  });

  it('aluno sem turma não enfileira nada', async () => {
    const { svc, enqueueMany, findTurmasDosUsuarios } = montar();
    findTurmasDosUsuarios.mockResolvedValueOnce([]);
    expect(await svc.receber(dto(2))).toEqual({
      duplicado: false,
      enfileirados: 0,
      pushes: 5,
    });
    expect(enqueueMany).not.toHaveBeenCalled();
  });
});

describe('rotas do recálculo (042/14)', () => {
  let app: INestApplication;
  const relatorio = {
    consultarRecalculo: jest.fn().mockResolvedValue({ divergentes: 3 }),
    pedirRecalculo: jest.fn().mockResolvedValue({ criado: true }),
  };
  const fim = { receber: jest.fn().mockResolvedValue({ duplicado: false }) };
  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'colab' };
      return true;
    },
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [
        RelatorioController,
        RelatorioDaProvaController,
        FimDoRecalculoController,
      ],
      providers: [
        { provide: RelatorioService, useValue: relatorio },
        { provide: FimDoRecalculoService, useValue: fim },
        { provide: EnvService, useValue: { get: () => 's3gr3do' } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passaTudo)
      .overrideGuard(PermissionsGuard)
      .useValue(passaTudo)
      .compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.useGlobalFilters(new ControllerExceptionsFilter());
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('GET/POST do simulado e da prova chegam no recálculo, com o colaborador do JWT', async () => {
    const srv = app.getHttpServer();
    await request(srv)
      .get(`/mssimulado/relatorio/simulado/${JOB}/recalculo-anulacao`)
      .expect(200);
    await request(srv)
      .post(`/mssimulado/relatorio/simulado/${JOB}/recalculo-anulacao`)
      .send({ cursinhoId: 'outro' })
      .expect(200);
    await request(srv)
      .get(`/mssimulado/relatorio/prova/${JOB}/recalculo-anulacao`)
      .expect(200);
    await request(srv)
      .post(`/mssimulado/relatorio/prova/${JOB}/recalculo-anulacao`)
      .expect(200);
    expect(relatorio.consultarRecalculo.mock.calls).toEqual([
      ['colab', 'relatorio-simulado', JOB],
      ['colab', 'relatorio-prova', JOB],
    ]);
    // ⚠️ O `cursinhoId` do corpo é ignorado: quem resolve é o JWT.
    expect(relatorio.pedirRecalculo.mock.calls).toEqual([
      ['colab', 'relatorio-simulado', JOB],
      ['colab', 'relatorio-prova', JOB],
    ]);
  });

  it('callback: segredo certo 202; errado ou ausente 401', async () => {
    const srv = app.getHttpServer();
    const corpo = {
      jobId: JOB,
      provaNome: 'P',
      simuladoIds: ['s'],
      numerosAnulados: [1],
      afetados: [{ usuario: 'u', historicoId: HIST(1), mes: '2026-10' }],
    };
    await request(srv)
      .post('/notificacoes/recalculo-anulacao')
      .set('x-notificacao-secret', 's3gr3do')
      .send(corpo)
      .expect(202);
    await request(srv)
      .post('/notificacoes/recalculo-anulacao')
      .set('x-notificacao-secret', 'errado!')
      .send(corpo)
      .expect(401);
    await request(srv)
      .post('/notificacoes/recalculo-anulacao')
      .send(corpo)
      .expect(401);
    expect(fim.receber).toHaveBeenCalledTimes(1);
  });

  it('callback com mês fora do formato → 400', async () => {
    await request(app.getHttpServer())
      .post('/notificacoes/recalculo-anulacao')
      .set('x-notificacao-secret', 's3gr3do')
      .send({
        jobId: JOB,
        provaNome: 'P',
        simuladoIds: [],
        numerosAnulados: [],
        afetados: [{ usuario: 'u', historicoId: HIST(1), mes: '10/2026' }],
      })
      .expect(400);
  });
});

describe('RelatorioService — recálculo (042/14)', () => {
  const montar = () => {
    const http = {
      consultarRecalculo: jest
        .fn()
        .mockResolvedValue({ jobAtivo: { id: 'j1' } }),
      pedirRecalculo: jest
        .fn()
        .mockResolvedValue({ criado: true, job: { id: 'j1' } }),
    };
    const svc = new RelatorioService(
      http as never,
      {} as never,
      {} as never,
      {
        resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
      } as never,
    );
    return { svc, http };
  };

  it('o cursinho vem do JWT; pedido repetido em 30 s devolve o estado sem pedir de novo', async () => {
    const { svc, http } = montar();
    const id = '65ecc850a528b39d273e7999';
    await svc.pedirRecalculo('colab', 'relatorio-simulado', id, 1_000_000);
    expect(http.pedirRecalculo).toHaveBeenCalledWith(
      'relatorio-simulado',
      id,
      'cur-1',
      'colab',
    );
    const r = await svc.pedirRecalculo(
      'colab',
      'relatorio-simulado',
      id,
      1_010_000,
    );
    expect(http.pedirRecalculo).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ criado: false, job: { id: 'j1' } });
    await svc.pedirRecalculo('colab', 'relatorio-simulado', id, 1_031_000);
    expect(http.pedirRecalculo).toHaveBeenCalledTimes(2);
  });
});
