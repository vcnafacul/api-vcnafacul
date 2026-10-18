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
 * Monitoramento por cursinho (tickets/044). Banco de verdade: o recorte é SQL,
 * e um filtro esquecido conta a plataforma inteira. Cada teste usa um cursinho
 * novo, porque os números ficam em cache por cursinho.
 */
describe('Monitoramento por cursinho (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let jwt: JwtService;

  const ids = {
    users: [] as string[],
    roles: [] as string[],
    geos: [] as string[],
    cursinhos: [] as string[],
    inscricoes: [] as string[],
    alunos: [] as string[],
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
    await apaga('student_course', ids.alunos);
    await apaga('inscription_course', ids.inscricoes);
    // users → roles (FK roleId) → cursinho (FK roles.partnerPrepCourseId)
    await apaga('users', ids.users);
    await apaga('roles', ids.roles);
    await apaga('partner_prep_course', ids.cursinhos);
    await apaga('geolocations', ids.geos);
    if (app) await app.close();
  });

  // ---- massa mínima, por SQL ----

  const usuario = async (
    permissoes: string[] = [],
    extra: { lastAccess?: string } = {},
  ) => {
    const id = randomUUID();
    let roleId: string | null = null;
    if (permissoes.length) {
      roleId = randomUUID();
      await db.query(
        `INSERT INTO roles (id, name${permissoes.map((p) => `, ${p}`).join('')})
         VALUES (?, ?${permissoes.map(() => ', 1').join('')})`,
        [roleId, `mon-${roleId.slice(0, 8)}`],
      );
      ids.roles.push(roleId);
    }
    await db.query(
      `INSERT INTO users (id, email, firstName, lastName, gender, birthday, phone, state, city, lgpd, roleId, lastAccess)
       VALUES (?, ?, 'Ana', 'Teste', 0, '2000-01-01', '11', 'SP', 'SP', 1, ?, ?)`,
      [id, `${id}@teste.com`, roleId, extra.lastAccess ?? null],
    );
    ids.users.push(id);
    return id;
  };

  const cursinho = async (nome = 'Cursinho') => {
    const geo = randomUUID();
    await db.query(
      `INSERT INTO geolocations (id, latitude, longitude, name, cep, state, city, neighborhood, street,
         user_fullname, user_phone, user_connection, user_email)
       VALUES (?, 0, 0, ?, '0', 'SP', 'SP', 'b', 'r', 'u', '1', 'c', 'e@e')`,
      [geo, nome],
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

  const processo = async (
    cursinhoId: string,
    {
      isTest = false,
      inicio = '2026-01-10',
      fim = '2026-02-10',
      nome = 'P',
      excluido = false,
    } = {},
  ) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO inscription_course (id, name, start_date, end_date, expected_opening, partner_prep_course_id, is_test, deleted_at)
       VALUES (?, ?, ?, ?, 10, ?, ?, ?)`,
      [
        id,
        nome,
        inicio,
        fim,
        cursinhoId,
        isTest ? 1 : 0,
        excluido ? new Date() : null,
      ],
    );
    ids.inscricoes.push(id);
    return id;
  };

  const inscricao = async (
    cursinhoId: string,
    processoId: string,
    {
      userId,
      matricula = false,
      excluida = false,
      criadaEm,
    }: {
      userId?: string;
      matricula?: boolean;
      excluida?: boolean;
      criadaEm?: string;
    } = {},
  ) => {
    const id = randomUUID();
    const uid = userId ?? (await usuario());
    await db.query(
      `INSERT INTO student_course (id, cpf, email, user_id, partner_prep_course_id, inscriptionCourseId,
         applicationStatus, cod_enrolled, deleted_at, created_at)
       VALUES (?, '000', 'a@a', ?, ?, ?, 'Em Análise', ?, ?, ?)`,
      [
        id,
        uid,
        cursinhoId,
        processoId,
        matricula ? `M${id.slice(0, 6)}` : null,
        excluida ? new Date() : null,
        criadaEm ?? new Date(),
      ],
    );
    ids.alunos.push(id);
    return uid;
  };

  const colaborador = async (
    cursinhoId: string,
    userId: string,
    desligado = false,
  ) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO collaborators (id, user_id, partner_prep_course_id, actived, deleted_at)
       VALUES (?, ?, ?, 1, ?)`,
      [id, userId, cursinhoId, desligado ? new Date() : null],
    );
    ids.colaboradores.push(id);
  };

  const bearer = async (userId: string) =>
    `Bearer ${await jwt.signAsync({ user: { id: userId } })}`;

  let admin: string;
  let adminComEstudantes: string;
  beforeAll(async () => {
    admin = await bearer(await usuario(['criar_questao']));
    adminComEstudantes = await bearer(
      await usuario(['criar_questao', 'visualizar_estudantes']),
    );
  });

  const get = (rota: string, auth?: string) => {
    const r = request(app.getHttpServer()).get(rota);
    return auth ? r.set('Authorization', auth) : r;
  };

  describe('resumo (card 01)', () => {
    it('sem token 401; sem permissão 403; cursinho inexistente 404; id inválido 400', async () => {
      const A = await cursinho();
      await get(`/monitoramento/resumo?cursinhoId=${A}`).expect(401);
      const semPermissao = await bearer(await usuario());
      await get(`/monitoramento/resumo?cursinhoId=${A}`, semPermissao).expect(
        403,
      );
      await get(
        `/monitoramento/resumo?cursinhoId=${randomUUID()}`,
        admin,
      ).expect(404);
      await get(`/monitoramento/resumo?cursinhoId=abc`, admin).expect(400);
    });

    it('conta só o cursinho, sem teste e sem excluídos', async () => {
      const A = await cursinho();
      const B = await cursinho();
      const p1 = await processo(A);
      const teste = await processo(A, { isTest: true });
      await processo(A, { excluido: true });
      const pB = await processo(B);
      await inscricao(A, p1, { matricula: true });
      await inscricao(A, p1);
      await inscricao(A, p1, { excluida: true, matricula: true });
      await inscricao(A, teste, { matricula: true });
      await inscricao(B, pB, { matricula: true });

      const res = await get(
        `/monitoramento/resumo?cursinhoId=${A}`,
        admin,
      ).expect(200);
      expect(res.body).toEqual({
        processosNaoTeste: 1,
        processosTotal: 2,
        inscricoesNaoTeste: 2,
        matriculasNaoTeste: 1,
      });
    });
  });

  describe('estudantes (card 01)', () => {
    it('exige visualizarEstudantes', async () => {
      const A = await cursinho();
      await get(`/monitoramento/estudantes?cursinhoId=${A}`, admin).expect(403);
      const res = await get(
        `/monitoramento/estudantes?cursinhoId=${A}`,
        adminComEstudantes,
      ).expect(200);
      expect(res.body).toEqual({ estudantesAtendidos: 0, estudantesAtivos: 0 });
    });
  });

  describe('usuários do cursinho (card 02)', () => {
    it('último acesso: colaboradores ativos × estudantes não teste, sem duplicar', async () => {
      const A = await cursinho();
      const B = await cursinho();
      const p = await processo(A);
      const teste = await processo(A, { isTest: true });

      // março: 1 colaborador ativo (que também é estudante), 1 desligado, 1 de outro cursinho
      const colabEstudante = await usuario([], {
        lastAccess: '2026-03-05 10:00:00',
      });
      await colaborador(A, colabEstudante);
      await inscricao(A, p, { userId: colabEstudante });
      await colaborador(
        A,
        await usuario([], { lastAccess: '2026-03-06 10:00:00' }),
        true,
      );
      await colaborador(
        B,
        await usuario([], { lastAccess: '2026-03-07 10:00:00' }),
      );

      // maio: estudante com duas inscrições no A conta 1; estudante só de teste não conta
      const duasInscricoes = await usuario([], {
        lastAccess: '2026-05-02 10:00:00',
      });
      await inscricao(A, p, { userId: duasInscricoes });
      await inscricao(A, p, { userId: duasInscricoes });
      await inscricao(A, teste, {
        userId: await usuario([], { lastAccess: '2026-05-03 10:00:00' }),
      });

      const res = await get(
        `/monitoramento/ultimo-acesso?cursinhoId=${A}&groupBy=month`,
        admin,
      ).expect(200);
      expect(res.body).toEqual([
        { period: '2026-03', colaboradores: 1, estudantes: 1 },
        { period: '2026-04', colaboradores: 0, estudantes: 0 },
        { period: '2026-05', colaboradores: 0, estudantes: 1 },
      ]);
    });

    it('cursinho sem acesso nenhum → lista vazia', async () => {
      const A = await cursinho();
      const res = await get(
        `/monitoramento/ultimo-acesso?cursinhoId=${A}`,
        admin,
      ).expect(200);
      expect(res.body).toEqual([]);
    });

    it('por perfil: só os papéis do cursinho', async () => {
      const A = await cursinho();
      const roleA = randomUUID();
      await db.query(
        `INSERT INTO roles (id, name, partnerPrepCourseId) VALUES (?, ?, ?)`,
        [roleA, `Professor ${roleA.slice(0, 8)}`, A],
      );
      ids.roles.push(roleA);
      for (let i = 0; i < 2; i++) {
        const u = await usuario();
        await db.query(`UPDATE users SET roleId = ? WHERE id = ?`, [roleA, u]);
      }
      const res = await get(
        `/monitoramento/usuarios-por-perfil?cursinhoId=${A}`,
        admin,
      ).expect(200);
      expect(res.body).toEqual([
        { name: `Professor ${roleA.slice(0, 8)}`, total: '2' },
      ]);
    });
  });
});
