import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/**
 * Alerta de risco de evasão do cursinho (tickets/054, card 01). Banco de
 * verdade: o que importa é que cada um lê e grava SÓ o próprio cursinho.
 */
describe('Alerta de risco de evasão (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let jwt: JwtService;

  const ids = {
    users: [] as string[],
    roles: [] as string[],
    geos: [] as string[],
    cursinhos: [] as string[],
    colaboradores: [] as string[],
  };

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
    jwt = mod.get(JwtService);
  });

  afterAll(async () => {
    const apaga = async (tabela: string, lista: string[]) => {
      if (lista.length)
        await db.query(`DELETE FROM ${tabela} WHERE id IN (?)`, [lista]);
    };
    await apaga('collaborators', ids.colaboradores);
    await apaga('partner_prep_course', ids.cursinhos);
    await apaga('geolocations', ids.geos);
    await apaga('users', ids.users);
    await apaga('roles', ids.roles);
    if (app) await app.close();
  });

  // ---- massa mínima, por SQL ----

  const cursinho = async () => {
    const geo = randomUUID();
    await db.query(
      `INSERT INTO geolocations (id, latitude, longitude, name, cep, state, city, neighborhood, street,
         user_fullname, user_phone, user_connection, user_email)
       VALUES (?, 0, 0, 'Cursinho', '0', 'SP', 'São Paulo', 'b', 'r', 'u', '1', 'c', 'e@e')`,
      [geo],
    );
    ids.geos.push(geo);
    const id = randomUUID();
    await db.query(
      `INSERT INTO partner_prep_course (id, geo_id) VALUES (?, ?)`,
      [id, geo],
    );
    ids.cursinhos.push(id);
    return id;
  };

  /** Colaborador ativo do cursinho com as permissões dadas; devolve o token. */
  const membro = async (
    cursinhoId: string,
    permissoes: { gerenciar_turmas?: boolean; visualizar_turmas?: boolean },
  ) => {
    const roleId = randomUUID();
    await db.query(
      `INSERT INTO roles (id, name, gerenciar_turmas, visualizar_turmas) VALUES (?, ?, ?, ?)`,
      [
        roleId,
        `054-${roleId}`,
        permissoes.gerenciar_turmas ? 1 : 0,
        permissoes.visualizar_turmas ? 1 : 0,
      ],
    );
    ids.roles.push(roleId);
    const userId = randomUUID();
    await db.query(
      `INSERT INTO users (id, email, firstName, lastName, gender, birthday, phone, state, city, lgpd, roleId)
       VALUES (?, ?, 'Ana', 'Teste', 0, '2000-01-01', '11', 'SP', 'SP', 1, ?)`,
      [userId, `${userId}@teste.com`, roleId],
    );
    ids.users.push(userId);
    const colaboradorId = randomUUID();
    await db.query(
      `INSERT INTO collaborators (id, user_id, partner_prep_course_id, actived) VALUES (?, ?, ?, 1)`,
      [colaboradorId, userId, cursinhoId],
    );
    ids.colaboradores.push(colaboradorId);
    return `Bearer ${await jwt.signAsync({ user: { id: userId } })}`;
  };

  const rota = '/partner-prep-course/alerta-evasao';

  it('sem token → 403 no GET e no PATCH (só PermissionsGuard, como a página)', async () => {
    await request(app.getHttpServer()).get(rota).expect(403);
    await request(app.getHttpServer())
      .patch(rota)
      .send({ percentual: 15, minimoDeAulas: 10 })
      .expect(403);
  });

  it('cursinho que nunca configurou → desligado, 10 aulas', async () => {
    const A = await cursinho();
    const monitor = await membro(A, { visualizar_turmas: true });
    await request(app.getHttpServer())
      .get(rota)
      .set('Authorization', monitor)
      .expect(200, { percentual: null, minimoDeAulas: 10 });
  });

  it('só visualizarTurmas → lê, mas não grava (403)', async () => {
    const A = await cursinho();
    const monitor = await membro(A, { visualizar_turmas: true });
    await request(app.getHttpServer())
      .patch(rota)
      .set('Authorization', monitor)
      .send({ percentual: 15, minimoDeAulas: 10 })
      .expect(403);
  });

  it('⚠️ gestor do A grava no A e o B não muda', async () => {
    const A = await cursinho();
    const B = await cursinho();
    const gestorA = await membro(A, {
      gerenciar_turmas: true,
      visualizar_turmas: true,
    });
    const leitorB = await membro(B, { visualizar_turmas: true });

    await request(app.getHttpServer())
      .patch(rota)
      .set('Authorization', gestorA)
      .send({ percentual: 15, minimoDeAulas: 12 })
      .expect(200, { percentual: 15, minimoDeAulas: 12 });

    await request(app.getHttpServer())
      .get(rota)
      .set('Authorization', gestorA)
      .expect(200, { percentual: 15, minimoDeAulas: 12 });
    await request(app.getHttpServer())
      .get(rota)
      .set('Authorization', leitorB)
      .expect(200, { percentual: null, minimoDeAulas: 10 });
  });

  it('percentual null desliga; valores fora da faixa → 400', async () => {
    const A = await cursinho();
    const gestor = await membro(A, {
      gerenciar_turmas: true,
      visualizar_turmas: true,
    });
    for (const corpo of [
      { percentual: 0, minimoDeAulas: 10 },
      { percentual: 101, minimoDeAulas: 10 },
      { percentual: 2.5, minimoDeAulas: 10 },
      { percentual: 15, minimoDeAulas: 0 },
    ]) {
      await request(app.getHttpServer())
        .patch(rota)
        .set('Authorization', gestor)
        .send(corpo)
        .expect(400);
    }
    await request(app.getHttpServer())
      .patch(rota)
      .set('Authorization', gestor)
      .send({ percentual: 20, minimoDeAulas: 10 })
      .expect(200);
    await request(app.getHttpServer())
      .patch(rota)
      .set('Authorization', gestor)
      .send({ percentual: null, minimoDeAulas: 10 })
      .expect(200, { percentual: null, minimoDeAulas: 10 });
  });
});
