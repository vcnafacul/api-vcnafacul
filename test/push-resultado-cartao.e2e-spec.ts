// ⚠️ Antes do AppModule: o EnvService lê o process.env ao subir.
process.env.NOTIFICACAO_SECRET = 'segredo-de-teste';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/** Push com o resultado do cartão (tickets/028). MySQL de verdade. */
describe('Push do resultado do cartão (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  const historicos: string[] = [];

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = createNestAppTest(mod);
    await app.init();
    db = mod.get(DataSource);
  });

  afterAll(async () => {
    if (historicos.length)
      await db.query(
        'DELETE FROM push_resultado_cartao WHERE historico_id IN (?)',
        [historicos],
      );
    if (app) await app.close();
  });

  let seq = 0;
  const novoHistorico = () => {
    const id = `64b0000000000000000${String(++seq).padStart(5, '0')}`;
    historicos.push(id);
    return id;
  };
  const aviso = (historicoId: string, over = {}) => ({
    historicoId,
    userId: 'aluno-1',
    simulado: 'Simulado de outubro',
    total: 90,
    acertos: 61,
    erros: 25,
    emBranco: 4,
    aproveitamento: 68,
    ...over,
  });
  const avisar = (corpo: object, segredo = 'segredo-de-teste') =>
    request(app.getHttpServer())
      .post('/notificacoes/resultado-cartao')
      .set('x-notificacao-secret', segredo)
      .send(corpo);
  const linha = async (historicoId: string) =>
    (
      await db.query(
        'SELECT * FROM push_resultado_cartao WHERE historico_id = ?',
        [historicoId],
      )
    )[0];

  describe('receber o aviso (card 02)', () => {
    it('segredo certo → 202 e a linha pendente', async () => {
      const h = novoHistorico();
      await avisar(aviso(h)).expect(202);
      expect(await linha(h)).toMatchObject({
        status: 'pendente',
        acertos: 61,
        erros: 25,
        em_branco: 4,
        aproveitamento: 68,
        envios: 0,
      });
    });

    it('segredo errado ou ausente → 401/403 e nada gravado', async () => {
      const h = novoHistorico();
      const errado = await avisar(aviso(h), 'outro');
      expect([401, 403]).toContain(errado.status);
      const sem = await request(app.getHttpServer())
        .post('/notificacoes/resultado-cartao')
        .send(aviso(h));
      expect([401, 403]).toContain(sem.status);
      expect(await linha(h)).toBeUndefined();
    });

    it('corpo inválido → 400', async () => {
      await avisar(aviso(novoHistorico(), { aproveitamento: 150 })).expect(400);
      await avisar(aviso('nao-e-id')).expect(400);
    });

    it('⚠️ dois avisos do mesmo histórico → UMA linha, com os números do último', async () => {
      const h = novoHistorico();
      await avisar(aviso(h)).expect(202);
      await avisar(
        aviso(h, { acertos: 70, erros: 18, emBranco: 2, aproveitamento: 78 }),
      ).expect(202);
      const [{ total }] = await db.query(
        'SELECT COUNT(*) AS total FROM push_resultado_cartao WHERE historico_id = ?',
        [h],
      );
      expect(Number(total)).toBe(1);
      expect(await linha(h)).toMatchObject({ acertos: 70, aproveitamento: 78 });
    });

    it('aviso depois de enviado → volta a pendente e mantém os envios (vira "atualizado")', async () => {
      const h = novoHistorico();
      await avisar(aviso(h)).expect(202);
      await db.query(
        "UPDATE push_resultado_cartao SET status = 'enviado', envios = 1 WHERE historico_id = ?",
        [h],
      );
      await avisar(aviso(h, { acertos: 62 })).expect(202);
      expect(await linha(h)).toMatchObject({
        status: 'pendente',
        envios: 1,
        acertos: 62,
      });
    });
  });
});
