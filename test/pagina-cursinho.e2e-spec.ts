import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { ImpactoDoCursinhoService } from 'src/modules/prepCourse/paginaCursinho/impacto-do-cursinho.service';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { InscriptionCourseRepository } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.repository';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
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

  const ids = {
    users: [] as string[],
    geos: [] as string[],
    cursinhos: [] as string[],
    inscricoes: [] as string[],
    alunos: [] as string[],
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
  });

  afterAll(async () => {
    const apaga = async (tabela: string, lista: string[]) => {
      if (lista.length)
        await db.query(`DELETE FROM ${tabela} WHERE id IN (?)`, [lista]);
    };
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
