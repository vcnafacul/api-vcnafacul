import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { ProvasDoMsService } from 'src/modules/prepCourse/eventoSimulado/provas-do-ms.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/**
 * Eventos de simulado (tickets/026). Banco, JWT e permissões de verdade; só o
 * ms é dublê (as provas e o cursinho dono de cada uma).
 */
describe('Eventos de simulado (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let jwt: JwtService;
  const provasNoMs = new Map<string, { nome: string; cursinhoId: string }>();

  const ids = {
    users: [] as string[],
    roles: [] as string[],
    geos: [] as string[],
    cursinhos: [] as string[],
    colaboradores: [] as string[],
    alunos: [] as string[],
    eventos: [] as string[],
  };

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(ProvasDoMsService)
      .useValue({
        buscar: async (id: string) => {
          const p = provasNoMs.get(id);
          return p ? { id, ...p, simuladoIds: [`sim-${id}`] } : null;
        },
      })
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
    await apaga('simulado_evento', ids.eventos);
    await apaga('student_course', ids.alunos);
    await apaga('collaborators', ids.colaboradores);
    await apaga('partner_prep_course', ids.cursinhos);
    await apaga('geolocations', ids.geos);
    await apaga('users', ids.users);
    await apaga('roles', ids.roles);
    if (app) await app.close();
  });

  // ---- massa mínima, por SQL ----

  const usuario = async (permissoes: string[] = []) => {
    const id = randomUUID();
    let roleId: string | null = null;
    if (permissoes.length) {
      roleId = randomUUID();
      await db.query(
        `INSERT INTO roles (id, name${permissoes.map((p) => `, ${p}`).join('')})
         VALUES (?, ?${permissoes.map(() => ', 1').join('')})`,
        [roleId, `evento-${roleId.slice(0, 8)}`],
      );
      ids.roles.push(roleId);
    }
    await db.query(
      `INSERT INTO users (id, email, firstName, lastName, gender, birthday, phone, state, city, lgpd, roleId)
       VALUES (?, ?, 'Ana', 'Teste', 0, '2000-01-01', '11', 'SP', 'SP', 1, ?)`,
      [id, `${id}@teste.com`, roleId],
    );
    ids.users.push(id);
    return id;
  };

  const cursinho = async () => {
    const geo = randomUUID();
    await db.query(
      `INSERT INTO geolocations (id, latitude, longitude, name, cep, state, city, neighborhood, street,
         user_fullname, user_phone, user_connection, user_email)
       VALUES (?, 0, 0, 'Cursinho', '0', 'SP', 'SP', 'b', 'r', 'u', '1', 'c', 'e@e')`,
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

  const colaborador = async (cursinhoId: string, permissoes: string[]) => {
    const u = await usuario(permissoes);
    const id = randomUUID();
    await db.query(
      `INSERT INTO collaborators (id, user_id, partner_prep_course_id, actived) VALUES (?, ?, ?, 1)`,
      [id, u, cursinhoId],
    );
    ids.colaboradores.push(id);
    return u;
  };

  const prova = (cursinhoId: string, nome: string) => {
    const id = randomUUID().replace(/-/g, '').slice(0, 24);
    provasNoMs.set(id, { nome, cursinhoId });
    return id;
  };

  const bearer = async (userId: string) =>
    `Bearer ${await jwt.signAsync({ user: { id: userId } })}`;

  const corpo = (provaIds: string[], over = {}) => ({
    nome: 'Simulado de outubro',
    descricao: 'Sábado, 8h',
    inscricoesDe: new Date(Date.now() - 60_000).toISOString(),
    inscricoesAte: new Date(Date.now() + 86_400_000).toISOString(),
    provaIds,
    ...over,
  });

  describe('gestão pelo cursinho (card 02)', () => {
    let A: string;
    let gestor: string;
    let leitor: string;
    let ingles: string;
    let espanhol: string;

    beforeAll(async () => {
      A = await cursinho();
      gestor = await colaborador(A, ['cadastrar_provas_cursinho']);
      leitor = await colaborador(A, ['visualizar_provas_cursinho']);
      ingles = prova(A, 'Simulado Inglês');
      espanhol = prova(A, 'Simulado Espanhol');
    });

    it('cria, lista (com status) e exclui', async () => {
      const criado = await request(app.getHttpServer())
        .post('/eventos-simulado/cursinho')
        .set('Authorization', await bearer(gestor))
        .send(corpo([ingles, espanhol]))
        .expect(201);
      ids.eventos.push(criado.body.id);
      expect(criado.body).toMatchObject({
        nome: 'Simulado de outubro',
        status: 'aberto',
        provas: [
          { provaId: ingles, nome: 'Simulado Inglês', inscritos: 0 },
          { provaId: espanhol, nome: 'Simulado Espanhol', inscritos: 0 },
        ],
      });

      const lista = await request(app.getHttpServer())
        .get('/eventos-simulado/cursinho')
        .set('Authorization', await bearer(leitor))
        .expect(200);
      expect(lista.body.map((e: { id: string }) => e.id)).toContain(
        criado.body.id,
      );

      await request(app.getHttpServer())
        .delete(`/eventos-simulado/cursinho/${criado.body.id}`)
        .set('Authorization', await bearer(gestor))
        .expect(204);
      const depois = await request(app.getHttpServer())
        .get('/eventos-simulado/cursinho')
        .set('Authorization', await bearer(gestor))
        .expect(200);
      expect(depois.body.map((e: { id: string }) => e.id)).not.toContain(
        criado.body.id,
      );
    });

    it('só ver provas → não cria (403)', async () => {
      await request(app.getHttpServer())
        .post('/eventos-simulado/cursinho')
        .set('Authorization', await bearer(leitor))
        .send(corpo([ingles]))
        .expect(403);
    });

    it('prova de outro cursinho e janela invertida → 400; sem provas → 400', async () => {
      const B = await cursinho();
      const deB = prova(B, 'Prova do B');
      const auth = await bearer(gestor);
      for (const c of [
        corpo([ingles, deB]),
        corpo([ingles], {
          inscricoesAte: new Date(Date.now() - 86_400_000).toISOString(),
        }),
        corpo([]),
      ]) {
        await request(app.getHttpServer())
          .post('/eventos-simulado/cursinho')
          .set('Authorization', auth)
          .send(c)
          .expect(400);
      }
    });

    it('⚠️ gestor do B não enxerga nem mexe no evento do A', async () => {
      const criado = await request(app.getHttpServer())
        .post('/eventos-simulado/cursinho')
        .set('Authorization', await bearer(gestor))
        .send(corpo([ingles]))
        .expect(201);
      ids.eventos.push(criado.body.id);

      const B = await cursinho();
      const gestorB = await colaborador(B, ['cadastrar_provas_cursinho']);
      const authB = await bearer(gestorB);
      const listaB = await request(app.getHttpServer())
        .get('/eventos-simulado/cursinho')
        .set('Authorization', authB)
        .expect(200);
      expect(listaB.body).toEqual([]);
      await request(app.getHttpServer())
        .put(`/eventos-simulado/cursinho/${criado.body.id}`)
        .set('Authorization', authB)
        .send(corpo([ingles]))
        .expect(404); // o evento é do A: para o B, ele não existe
      await request(app.getHttpServer())
        .delete(`/eventos-simulado/cursinho/${criado.body.id}`)
        .set('Authorization', authB)
        .expect(404);
    });

    it('tirar do evento a prova com inscritos → 409', async () => {
      const criado = await request(app.getHttpServer())
        .post('/eventos-simulado/cursinho')
        .set('Authorization', await bearer(gestor))
        .send(corpo([ingles, espanhol]))
        .expect(201);
      ids.eventos.push(criado.body.id);
      const aluno = await usuario();
      await db.query(
        `INSERT INTO simulado_evento_inscricao (id, evento_id, user_id, prova_id) VALUES (?, ?, ?, ?)`,
        [randomUUID(), criado.body.id, aluno, espanhol],
      );

      const r = await request(app.getHttpServer())
        .put(`/eventos-simulado/cursinho/${criado.body.id}`)
        .set('Authorization', await bearer(gestor))
        .send(corpo([ingles]))
        .expect(409);
      expect(r.body.message).toContain('Há alunos inscritos nesta prova');

      await request(app.getHttpServer())
        .put(`/eventos-simulado/cursinho/${criado.body.id}`)
        .set('Authorization', await bearer(gestor))
        .send(corpo([espanhol], { nome: 'Renomeado' }))
        .expect(200);
    });
  });

  describe('inscrição do aluno (card 03)', () => {
    let A: string;
    let ingles: string;
    let espanhol: string;
    let aberto: string;
    let agendado: string;

    const aluno = async (cursinhoId: string, status = 'Matriculado') => {
      const u = await usuario();
      const id = randomUUID();
      await db.query(
        `INSERT INTO student_course (id, cpf, email, user_id, partner_prep_course_id, applicationStatus)
         VALUES (?, '000', 'a@a', ?, ?, ?)`,
        [id, u, cursinhoId, status],
      );
      ids.alunos.push(id);
      return u;
    };

    beforeAll(async () => {
      A = await cursinho();
      const gestor = await colaborador(A, ['cadastrar_provas_cursinho']);
      ingles = prova(A, 'Simulado Inglês');
      espanhol = prova(A, 'Simulado Espanhol');
      const auth = await bearer(gestor);
      const r1 = await request(app.getHttpServer())
        .post('/eventos-simulado/cursinho')
        .set('Authorization', auth)
        .send(corpo([ingles, espanhol]))
        .expect(201);
      aberto = r1.body.id;
      const r2 = await request(app.getHttpServer())
        .post('/eventos-simulado/cursinho')
        .set('Authorization', auth)
        .send(
          corpo([ingles], {
            nome: 'Futuro',
            inscricoesDe: new Date(Date.now() + 86_400_000).toISOString(),
            inscricoesAte: new Date(Date.now() + 2 * 86_400_000).toISOString(),
          }),
        )
        .expect(201);
      agendado = r2.body.id;
      ids.eventos.push(aberto, agendado);
    });

    const meus = async (u: string) =>
      (
        await request(app.getHttpServer())
          .get('/eventos-simulado/meus')
          .set('Authorization', await bearer(u))
          .expect(200)
      ).body;

    it('matriculado vê só o evento aberto; se inscreve, troca e desiste', async () => {
      const u = await aluno(A);
      const auth = await bearer(u);
      const visiveis = await meus(u);
      expect(visiveis.map((e: { id: string }) => e.id)).toEqual([aberto]);
      expect(visiveis[0].minhaProvaId).toBeNull();

      const r1 = await request(app.getHttpServer())
        .put(`/eventos-simulado/${aberto}/inscricao`)
        .set('Authorization', auth)
        .send({ provaId: ingles })
        .expect(200);
      expect(r1.body.resultado).toBe('nova');

      const r2 = await request(app.getHttpServer())
        .put(`/eventos-simulado/${aberto}/inscricao`)
        .set('Authorization', auth)
        .send({ provaId: espanhol })
        .expect(200);
      expect(r2.body.resultado).toBe('troca');
      expect((await meus(u))[0].minhaProvaId).toBe(espanhol);

      const [{ total }] = await db.query(
        'SELECT COUNT(*) AS total FROM simulado_evento_inscricao WHERE evento_id = ? AND user_id = ?',
        [aberto, u],
      );
      expect(Number(total)).toBe(1);

      await request(app.getHttpServer())
        .delete(`/eventos-simulado/${aberto}/inscricao`)
        .set('Authorization', auth)
        .expect(204);
      expect((await meus(u))[0].minhaProvaId).toBeNull();
    });

    it('evento agendado (fora da janela) → 404', async () => {
      const u = await aluno(A);
      await request(app.getHttpServer())
        .put(`/eventos-simulado/${agendado}/inscricao`)
        .set('Authorization', await bearer(u))
        .send({ provaId: ingles })
        .expect(404);
    });

    it.each([
      ['inscrito não matriculado', 'Em Análise'],
      ['matrícula cancelada', 'Matrícula Cancelada'],
    ])('%s: não vê e recebe 403', async (_n, status) => {
      const u = await aluno(A, status);
      expect(await meus(u)).toEqual([]);
      await request(app.getHttpServer())
        .put(`/eventos-simulado/${aberto}/inscricao`)
        .set('Authorization', await bearer(u))
        .send({ provaId: ingles })
        .expect(403);
    });

    it('matriculado de outro cursinho: não vê e recebe 403', async () => {
      const B = await cursinho();
      const u = await aluno(B);
      expect(await meus(u)).toEqual([]);
      await request(app.getHttpServer())
        .put(`/eventos-simulado/${aberto}/inscricao`)
        .set('Authorization', await bearer(u))
        .send({ provaId: ingles })
        .expect(403);
    });

    it('prova que não é do evento → 400; deslogado → 401', async () => {
      const u = await aluno(A);
      await request(app.getHttpServer())
        .put(`/eventos-simulado/${aberto}/inscricao`)
        .set('Authorization', await bearer(u))
        .send({ provaId: '64b000000000000000000999' })
        .expect(400);
      await request(app.getHttpServer())
        .get('/eventos-simulado/meus')
        .expect(401);
    });
  });
});
