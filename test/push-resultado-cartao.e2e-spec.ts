// ⚠️ Antes do AppModule: o EnvService lê o process.env ao subir.
process.env.NOTIFICACAO_SECRET = 'segredo-de-teste';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { EnvioDeResultadoTask } from 'src/modules/push/resultado-cartao/envio-de-resultado.task';
import { PushService } from 'src/modules/push/push.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { NotificacaoDoUsuario } from 'src/modules/push/central/notificacao-do-usuario.entity';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { DataSource } from 'typeorm';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/** Push com o resultado do cartão (tickets/028). MySQL de verdade. */
describe('Push do resultado do cartão (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  const historicos: string[] = [];
  let task: EnvioDeResultadoTask;
  const push = {
    habilitado: true,
    garantirHabilitado: jest.fn(() => {
      if (!push.habilitado) throw new Error('off');
    }),
    sendToUsers: jest.fn().mockResolvedValue({ enviados: 1, falhas: 0 }),
  };

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(PushService)
      .useValue(push)
      .compile();
    app = createNestAppTest(mod);
    await app.init();
    db = mod.get(DataSource);
    task = mod.get(EnvioDeResultadoTask);
    task.pausa = async () => undefined; // sem esperar de verdade no teste
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

  describe('envio calmo (card 03)', () => {
    const status = async (ids: string[]) =>
      (await db.query(
        'SELECT historico_id, status, envios, tentativas FROM push_resultado_cartao WHERE historico_id IN (?)',
        [ids],
      )) as {
        historico_id: string;
        status: string;
        envios: number;
        tentativas: number;
      }[];

    beforeEach(async () => {
      push.habilitado = true;
      push.sendToUsers
        .mockReset()
        .mockResolvedValue({ enviados: 1, falhas: 0 });
      // cada teste começa sem pendentes de outros testes
      if (historicos.length)
        await db.query(
          "UPDATE push_resultado_cartao SET status = 'enviado' WHERE historico_id IN (?)",
          [historicos],
        );
    });

    it('⚠️ 100 de uma vez: saem em lotes de 20, cada um uma vez só, mesmo com rodadas em paralelo', async () => {
      const ids = Array.from({ length: 100 }, novoHistorico);
      for (const [i, h] of ids.entries()) {
        await avisar(aviso(h, { userId: `aluno-${i}` })).expect(202);
      }

      expect(await task.rodar()).toBe(20);
      expect(push.sendToUsers).toHaveBeenCalledTimes(20);

      // o resto, com duas rodadas disputando ao mesmo tempo
      for (let i = 0; i < 4; i++)
        await Promise.all([task.rodar(), task.rodar()]);
      expect(push.sendToUsers).toHaveBeenCalledTimes(100);
      const destinatarios = push.sendToUsers.mock.calls.map(([u]) => u[0]);
      expect(new Set(destinatarios).size).toBe(100);
      expect(
        (await status(ids)).every(
          (l) => l.status === 'enviado' && l.envios === 1,
        ),
      ).toBe(true);
    });

    it('falha: reagenda; 3 falhas: desiste', async () => {
      const h = novoHistorico();
      await avisar(aviso(h)).expect(202);
      push.sendToUsers.mockRejectedValue(new Error('FCM fora'));

      await task.rodar();
      expect((await status([h]))[0]).toMatchObject({
        status: 'pendente',
        tentativas: 1,
      });

      // as próximas tentativas vencem "no futuro"
      await task.rodar(new Date(Date.now() + 2 * 60_000));
      expect((await status([h]))[0]).toMatchObject({
        status: 'pendente',
        tentativas: 2,
      });
      await task.rodar(new Date(Date.now() + 10 * 60_000));
      expect((await status([h]))[0]).toMatchObject({
        status: 'falhou',
        tentativas: 3,
      });
    });

    it('push desligado (fora de prod): tira da fila como ignorado, sem enviar', async () => {
      const h = novoHistorico();
      await avisar(aviso(h)).expect(202);
      push.habilitado = false;
      expect(await task.rodar()).toBe(0);
      expect(push.sendToUsers).not.toHaveBeenCalled();
      expect((await status([h]))[0].status).toBe('ignorado');
    });

    it('⚠️ aviso novo DURANTE o envio: não se perde — sai de novo como "atualizado"', async () => {
      const h = novoHistorico();
      await avisar(aviso(h)).expect(202);
      push.sendToUsers.mockImplementationOnce(async () => {
        // chega a correção de leitura enquanto o primeiro push está saindo
        await avisar(aviso(h, { acertos: 70 })).expect(202);
        return { enviados: 1, falhas: 0 };
      });

      await task.rodar();
      expect((await status([h]))[0]).toMatchObject({
        status: 'pendente',
        envios: 1,
      });

      await task.rodar();
      const segundo = push.sendToUsers.mock.calls[1][1];
      expect(segundo.title).toBe(
        '📊 Resultado atualizado: Simulado de outubro',
      );
      expect(segundo.body).toContain('70 acertos');
      expect((await status([h]))[0]).toMatchObject({
        status: 'enviado',
        envios: 2,
      });
    });
  });

  describe('central do app (central-notificacoes, card 01)', () => {
    const novoAluno = async () => {
      const dto = {
        ...CreateUserDtoInputFaker(),
        email: `central-${randomUUID()}@teste.com`,
      };
      await app.get(UserService).create(dto);
      return app.get(UserRepository).findOneBy({ email: dto.email });
    };
    const daCentral = (userId: string) =>
      db.getRepository(NotificacaoDoUsuario).find({ where: { userId } });

    it('enviado → o resultado vai para a central do aluno, uma vez', async () => {
      const aluno = await novoAluno();
      await avisar(aviso(novoHistorico(), { userId: aluno.id })).expect(202);
      await task.rodar();
      await task.rodar();
      const linhas = await daCentral(aluno.id);
      expect(linhas).toHaveLength(1);
      expect(linhas[0].pushNotificationId).toBeNull();
      expect(linhas[0].corpo).toContain('61');
    });

    it('⚠️ push desligado → não envia, mas o aluno ainda vê na central', async () => {
      const aluno = await novoAluno();
      push.habilitado = false;
      try {
        await avisar(aviso(novoHistorico(), { userId: aluno.id })).expect(202);
        await task.rodar();
      } finally {
        push.habilitado = true;
      }
      expect(push.sendToUsers).not.toHaveBeenCalledWith(
        [aluno.id],
        expect.anything(),
      );
      expect(await daCentral(aluno.id)).toHaveLength(1);
    });
  });
});
