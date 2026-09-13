import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { QuestaoController } from './questao.controller';
import { QuestaoService } from './questao.service';

/**
 * A rota literal `summary` não pode ser engolida pelo `:id`.
 *
 * ⚠️ **Só um app de verdade pega isto.** A colisão não existe no controller —
 * ela nasce no roteamento. Chamar `controller.getSummary()` direto sempre
 * funciona, e é por isso que nenhum teste de unidade acusaria.
 *
 * O que estava acontecendo: `@Get(':id')` era declarado **antes** de
 * `@Get('summary')`. No Express a primeira rota que casa vence, então
 * `GET /mssimulado/questoes/summary` caía no `getById()` com `id = "summary"`
 * — e o proxy repassava isso ao ms como se fosse um id de questão.
 *
 * ⚠️ O endpoint existe e funciona **no ms** (`v1/questao/summary`, que lá está
 * na ordem certa). Quem o tornava inalcançável era só esta camada. O client
 * chama esta rota na home pública, pelo `impactStats.ts`.
 */
describe('QuestaoController — a rota summary vence o :id', () => {
  let app: INestApplication;

  const service = {
    getSummary: jest.fn().mockResolvedValue({ questionTotal: 723 }),
    getById: jest.fn().mockResolvedValue({ _id: 'x' }),
  };

  const passaTudo = { canActivate: () => true };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [QuestaoController],
      providers: [{ provide: QuestaoService, useValue: service }],
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
    service.getSummary.mockClear();
    service.getById.mockClear();
  });

  it('GET /summary chega no getSummary, não no getById', async () => {
    const r = await request(app.getHttpServer())
      .get('/mssimulado/questoes/summary')
      .expect(200);

    expect(r.body).toEqual({ questionTotal: 723 });
    // ⚠️ A asserção que separa "respondeu" de "respondeu pelo caminho certo".
    expect(service.getById).not.toHaveBeenCalled();
  });

  it('GET /:id continua chegando no getById', async () => {
    // ⚠️ O par do teste acima: mover o literal para cima não pode ter
    // quebrado a rota que já funcionava.
    await request(app.getHttpServer())
      .get('/mssimulado/questoes/65ecc850a528b39d273e7900')
      .expect(200);

    expect(service.getById).toHaveBeenCalledWith('65ecc850a528b39d273e7900');
    expect(service.getSummary).not.toHaveBeenCalled();
  });
});
