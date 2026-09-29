import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from 'src/app.module';
import { CollaboratorService } from 'src/modules/prepCourse/collaborator/collaborator.service';
import { ImpactoDoCursinhoService } from 'src/modules/prepCourse/paginaCursinho/impacto-do-cursinho.service';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { InscriptionCourseRepository } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.repository';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/**
 * Tela do Cursinho (tickets/025). Banco de verdade: os filtros por cursinho
 * são SQL, e é no SQL que um filtro esquecido conta a plataforma inteira.
 */
describe('Página do cursinho (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let impacto: ImpactoDoCursinhoService;
  let students: StudentCourseRepository;
  let inscricoes: InscriptionCourseRepository;
  let jwt: JwtService;
  let colaboradores: CollaboratorService;

  const ids = {
    users: [] as string[],
    geos: [] as string[],
    cursinhos: [] as string[],
    inscricoes: [] as string[],
    alunos: [] as string[],
    paginas: [] as string[],
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
    impacto = mod.get(ImpactoDoCursinhoService);
    students = mod.get(StudentCourseRepository);
    inscricoes = mod.get(InscriptionCourseRepository);
    jwt = mod.get(JwtService);
    colaboradores = mod.get(CollaboratorService);
  });

  afterAll(async () => {
    const apaga = async (tabela: string, lista: string[]) => {
      if (lista.length)
        await db.query(`DELETE FROM ${tabela} WHERE id IN (?)`, [lista]);
    };
    await apaga('collaborators', ids.colaboradores);
    await apaga('cursinho_pagina', ids.paginas);
    await apaga('student_course', ids.alunos);
    await apaga('inscription_course', ids.inscricoes);
    await apaga('partner_prep_course', ids.cursinhos);
    await apaga('geolocations', ids.geos);
    await apaga('users', ids.users);
    if (app) await app.close();
  });

  // ---- massa mínima, por SQL ----

  const usuario = async () => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO users (id, email, firstName, lastName, gender, birthday, phone, state, city, lgpd)
       VALUES (?, ?, 'Ana', 'Teste', 0, '2000-01-01', '11', 'SP', 'SP', 1)`,
      [id, `${id}@teste.com`],
    );
    ids.users.push(id);
    return id;
  };

  const cursinho = async (nome: string) => {
    const geo = randomUUID();
    await db.query(
      `INSERT INTO geolocations (id, latitude, longitude, name, cep, state, city, neighborhood, street,
         user_fullname, user_phone, user_connection, user_email)
       VALUES (?, 0, 0, ?, '0', 'SP', 'São Paulo', 'b', 'r', 'u', '1', 'c', 'e@e')`,
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

  const processo = async (cursinhoId: string, isTest = false) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO inscription_course (id, name, start_date, end_date, expected_opening, partner_prep_course_id, is_test)
       VALUES (?, 'P', NOW(), NOW(), 10, ?, ?)`,
      [id, cursinhoId, isTest ? 1 : 0],
    );
    ids.inscricoes.push(id);
    return id;
  };

  const aluno = async (cursinhoId: string, userId: string, status: string) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO student_course (id, cpf, email, user_id, partner_prep_course_id, applicationStatus)
       VALUES (?, '000', 'a@a', ?, ?, ?)`,
      [id, userId, cursinhoId, status],
    );
    ids.alunos.push(id);
  };

  const pagina = async (
    cursinhoId: string,
    slug: string,
    active: boolean,
    links: { tipo: string; titulo: string; url: string }[] = [],
  ) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO cursinho_pagina (id, partner_prep_course_id, slug, quem_somos, active)
       VALUES (?, ?, ?, 'Somos um cursinho', ?)`,
      [id, cursinhoId, slug, active ? 1 : 0],
    );
    ids.paginas.push(id);
    for (const [ordem, l] of links.entries()) {
      await db.query(
        `INSERT INTO cursinho_link (id, pagina_id, tipo, titulo, url, ordem) VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), id, l.tipo, l.titulo, l.url, ordem],
      );
    }
    return id;
  };

  describe('página pública (card 04)', () => {
    const sufixo = randomUUID().slice(0, 8);

    it('ativa → 200 com a lista branca e sem links internos', async () => {
      const A = await cursinho('Cursinho Público');
      await pagina(A, `publica-${sufixo}`, true, [
        { tipo: 'publico', titulo: 'Site', url: 'https://site.org' },
        { tipo: 'interno', titulo: 'Drive', url: 'https://drive.interno' },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/cursinho-pagina/publica-${sufixo}`)
        .expect(200);

      expect(res.body).toMatchObject({
        cursinhoId: A,
        nome: 'Cursinho Público',
        localizacao: 'São Paulo - SP',
        quemSomos: 'Somos um cursinho',
        linksPublicos: [{ titulo: 'Site', url: 'https://site.org' }],
      });
      expect(JSON.stringify(res.body)).not.toContain('drive.interno');
      expect(JSON.stringify(res.body)).not.toContain('e@e'); // user_email do geo
    });

    it('desativada e inexistente → o mesmo 404', async () => {
      const B = await cursinho('Cursinho Desativado');
      await pagina(B, `desativada-${sufixo}`, false);
      for (const slug of [`desativada-${sufixo}`, `nao-existe-${sufixo}`]) {
        const res = await request(app.getHttpServer())
          .get(`/cursinho-pagina/${slug}`)
          .expect(404);
        expect(res.body.message).toBe('Página não encontrada');
      }
    });
  });

  const colaborador = async (
    cursinhoId: string,
    userId: string,
    ativo = true,
  ) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO collaborators (id, user_id, partner_prep_course_id, actived) VALUES (?, ?, ?, ?)`,
      [id, userId, cursinhoId, ativo ? 1 : 0],
    );
    ids.colaboradores.push(id);
  };

  const bearer = async (userId: string) =>
    `Bearer ${await jwt.signAsync({ user: { id: userId } })}`;

  describe('links internos (card 05)', () => {
    const sufixo = randomUUID().slice(0, 8);
    let A: string;
    let B: string;
    const rota = (slug = `internos-${sufixo}`) =>
      `/cursinho-pagina/${slug}/links-internos`;

    beforeAll(async () => {
      A = await cursinho('Cursinho com internos');
      B = await cursinho('Outro cursinho');
      await pagina(A, `internos-${sufixo}`, true, [
        { tipo: 'publico', titulo: 'Site', url: 'https://site.org' },
        { tipo: 'interno', titulo: 'Drive', url: 'https://drive.interno' },
      ]);
    });

    it('deslogado → 401', async () => {
      await request(app.getHttpServer()).get(rota()).expect(401);
    });

    it('colaborador ativo do A → só os internos do A', async () => {
      const u = await usuario();
      await colaborador(A, u);
      const res = await request(app.getHttpServer())
        .get(rota())
        .set('Authorization', await bearer(u))
        .expect(200);
      expect(res.body).toEqual([
        { titulo: 'Drive', url: 'https://drive.interno' },
      ]);
    });

    it('aluno matriculado do A → ok', async () => {
      const u = await usuario();
      await aluno(A, u, 'Matriculado');
      await request(app.getHttpServer())
        .get(rota())
        .set('Authorization', await bearer(u))
        .expect(200);
    });

    it.each([
      ['colaborador do B', async (u: string) => colaborador(B, u)],
      [
        'colaborador inativo do A',
        async (u: string) => colaborador(A, u, false),
      ],
      [
        'inscrito não matriculado do A',
        async (u: string) => aluno(A, u, 'Em Análise'),
      ],
      [
        'matrícula cancelada no A',
        async (u: string) => aluno(A, u, 'Matrícula Cancelada'),
      ],
      ['logado sem vínculo nenhum', async () => undefined],
    ])('%s → 403', async (_n, vincular) => {
      const u = await usuario();
      await vincular(u);
      await request(app.getHttpServer())
        .get(rota())
        .set('Authorization', await bearer(u))
        .expect(403);
    });

    it('página inexistente → 404', async () => {
      const u = await usuario();
      await colaborador(A, u);
      await request(app.getHttpServer())
        .get(rota(`nao-existe-${sufixo}`))
        .set('Authorization', await bearer(u))
        .expect(404);
    });
  });

  describe('cache dos colaboradores da página', () => {
    it('ativar e desativar aparecem na hora, com a página em cache', async () => {
      const sufixo = randomUUID().slice(0, 8);
      const A = await cursinho('Cursinho do cache');
      await pagina(A, `cache-${sufixo}`, true);
      const u = await usuario();
      const colabId = randomUUID();
      await db.query(
        `INSERT INTO collaborators (id, user_id, partner_prep_course_id, actived) VALUES (?, ?, ?, 0)`,
        [colabId, u, A],
      );
      ids.colaboradores.push(colabId);
      const nomes = async () =>
        (
          await request(app.getHttpServer())
            .get(`/cursinho-pagina/cache-${sufixo}`)
            .expect(200)
        ).body.colaboradores.map((c: { name: string }) => c.name);

      expect(await nomes()).toEqual([]); // página e lista entram no cache

      await colaboradores.changeActive(colabId);
      expect(await nomes()).toEqual(['Ana Teste']);

      await colaboradores.changeActive(colabId);
      expect(await nomes()).toEqual([]);
    });
  });

  describe('números por cursinho (card 03)', () => {
    it('cada número conta só o cursinho pedido; teste fica de fora', async () => {
      const antesPlataforma = {
        atendidos: await students.countStudentsEffectivelyServed(),
        ativos: await students.countStudentsCurrentlyEnrolled(),
        processos: await inscricoes.getTotalNonTest(),
      };

      const A = await cursinho('Cursinho A');
      const B = await cursinho('Cursinho B');
      const [u1, u2, u3, u4, u5] = await Promise.all(
        [1, 2, 3, 4, 5].map(usuario),
      );

      await processo(A);
      await processo(A);
      await processo(A, true); // teste: não conta
      await processo(B);

      await aluno(A, u1, 'Matriculado');
      await aluno(A, u2, 'Matriculado');
      await aluno(A, u2, 'Matriculado'); // mesmo aluno duas vezes: conta 1
      await aluno(A, u3, 'Matrícula Cancelada'); // atendido, não ativo
      await aluno(A, u4, 'Em Análise'); // nem atendido nem ativo
      await aluno(B, u5, 'Matriculado');

      const n = await impacto.numeros(A);
      expect(n).toMatchObject({
        estudantesAtendidos: 3,
        estudantesAtivos: 2,
        processosSeletivos: 2,
      });

      // Os números da plataforma continuam contando todo mundo.
      expect(await students.countStudentsEffectivelyServed()).toBe(
        antesPlataforma.atendidos + 4,
      );
      expect(await students.countStudentsCurrentlyEnrolled()).toBe(
        antesPlataforma.ativos + 3,
      );
      expect(await inscricoes.getTotalNonTest()).toBe(
        antesPlataforma.processos + 3,
      );
    });
  });
});
