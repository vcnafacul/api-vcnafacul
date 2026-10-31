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
 * Lista da chamada com os dados do risco de evasão (tickets/054, card 02).
 * Banco de verdade: as contagens são SQL, e é no SQL que uma chamada
 * excluída ou uma justificativa apagada entra na conta sem ninguém ver.
 */
describe('Chamada com risco de evasão (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let jwt: JwtService;

  const ids: Record<string, string[]> = {
    absence_justification: [],
    period_justification: [],
    student_attendance: [],
    attendance_record: [],
    student_course: [],
    classes: [],
    collaborators: [],
    partner_prep_course: [],
    geolocations: [],
    users: [],
    roles: [],
  };
  const guarda = (tabela: string, id: string) => {
    ids[tabela].push(id);
    return id;
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
    // Na ordem das FKs.
    for (const [tabela, lista] of Object.entries(ids)) {
      if (lista.length)
        await db.query(`DELETE FROM ${tabela} WHERE id IN (?)`, [lista]);
    }
    if (app) await app.close();
  });

  // ---- massa mínima, por SQL ----

  const usuario = async (roleId: string | null = null) => {
    const id = guarda('users', randomUUID());
    await db.query(
      `INSERT INTO users (id, email, firstName, lastName, gender, birthday, phone, state, city, lgpd, roleId)
       VALUES (?, ?, 'Ana', 'Teste', 0, '2000-01-01', '11', 'SP', 'SP', 1, ?)`,
      [id, `${id}@teste.com`, roleId],
    );
    return id;
  };

  const cursinho = async (alerta: number | null, minimo = 10) => {
    const geo = guarda('geolocations', randomUUID());
    await db.query(
      `INSERT INTO geolocations (id, latitude, longitude, name, cep, state, city, neighborhood, street,
         user_fullname, user_phone, user_connection, user_email)
       VALUES (?, 0, 0, 'Cursinho', '0', 'SP', 'São Paulo', 'b', 'r', 'u', '1', 'c', 'e@e')`,
      [geo],
    );
    const id = guarda('partner_prep_course', randomUUID());
    await db.query(
      `INSERT INTO partner_prep_course (id, geo_id, alerta_evasao_percentual, alerta_evasao_minimo_aulas)
       VALUES (?, ?, ?, ?)`,
      [id, geo, alerta, minimo],
    );
    return id;
  };

  const gestor = async (cursinhoId: string) => {
    const roleId = guarda('roles', randomUUID());
    await db.query(
      `INSERT INTO roles (id, name, gerenciar_turmas, visualizar_turmas) VALUES (?, ?, 1, 1)`,
      [roleId, `054-02-${roleId}`],
    );
    const userId = await usuario(roleId);
    const colaboradorId = guarda('collaborators', randomUUID());
    await db.query(
      `INSERT INTO collaborators (id, user_id, partner_prep_course_id, actived) VALUES (?, ?, ?, 1)`,
      [colaboradorId, userId, cursinhoId],
    );
    return `Bearer ${await jwt.signAsync({ user: { id: userId } })}`;
  };

  const turma = async (cursinhoId: string) => {
    const id = guarda('classes', randomUUID());
    await db.query(
      `INSERT INTO classes (id, name, partner_prep_course_id) VALUES (?, 'Turma 054', ?)`,
      [id, cursinhoId],
    );
    return id;
  };

  const aluno = async (cursinhoId: string, classId: string) => {
    const userId = await usuario();
    const id = guarda('student_course', randomUUID());
    await db.query(
      `INSERT INTO student_course (id, cpf, email, user_id, partner_prep_course_id, applicationStatus, classId, cod_enrolled)
       VALUES (?, '000', 'a@a', ?, ?, 'Matriculado', ?, ?)`,
      [id, userId, cursinhoId, classId, id.slice(0, 8)],
    );
    return id;
  };

  /** Uma chamada no dia `dia` (YYYY-MM-DD); `presencas` = aluno → presente. */
  const chamada = async (
    classId: string,
    dia: string,
    presencas: [string, boolean][],
    excluida = false,
  ) => {
    const id = guarda('attendance_record', randomUUID());
    await db.query(
      `INSERT INTO attendance_record (id, registeredAt, classId, period, deleted_at)
       VALUES (?, ?, ?, 'NOITE', ?)`,
      [id, `${dia} 00:00:00`, classId, excluida ? new Date() : null],
    );
    const linhas: Record<string, string> = {};
    for (const [alunoId, presente] of presencas) {
      const sa = guarda('student_attendance', randomUUID());
      await db.query(
        `INSERT INTO student_attendance (id, present, studentCourseId, attendanceRecordId)
         VALUES (?, ?, ?, ?)`,
        [sa, presente ? 1 : 0, alunoId, id],
      );
      linhas[alunoId] = sa;
    }
    return linhas;
  };

  const justificar = async (studentAttendanceId: string) => {
    const id = guarda('absence_justification', randomUUID());
    await db.query(
      `INSERT INTO absence_justification (id, justification, studentAttendanceId) VALUES (?, 'atestado', ?)`,
      [id, studentAttendanceId],
    );
  };

  const periodo = async (
    alunoId: string,
    inicio: string,
    fim: string,
    excluido = false,
  ) => {
    const id = guarda('period_justification', randomUUID());
    await db.query(
      `INSERT INTO period_justification (id, start_date, end_date, justification, student_course_id, deleted_at)
       VALUES (?, ?, ?, 'licença', ?, ?)`,
      [id, inicio, fim, alunoId, excluido ? new Date() : null],
    );
  };

  const chamadaDaTurma = (token: string, classId: string) =>
    request(app.getHttpServer())
      .get(`/class/${classId}/attendance-record`)
      .set('Authorization', token)
      .expect(200)
      .then((r) => r.body);

  it('conta aulas e só as faltas sem justificativa; traz os intervalos ativos', async () => {
    const C = await cursinho(15, 10);
    const token = await gestor(C);
    const T = await turma(C);
    const joana = await aluno(C, T);

    // 12 aulas: 9 presenças, 3 faltas (1 justificada individual, 1 coberta
    // por justificativa por período, 1 sem justificativa).
    const linhas: Record<string, string>[] = [];
    for (let d = 1; d <= 12; d++) {
      const dia = `2026-03-${String(d).padStart(2, '0')}`;
      linhas.push(await chamada(T, dia, [[joana, ![3, 7, 9].includes(d)]]));
    }
    await justificar(linhas[2][joana]); // dia 3
    await justificar(linhas[6][joana]); // dia 7 (cópia do período)
    await periodo(joana, '2026-03-07', '2026-03-07');
    // Excluída não entra; justificativa por período excluída não vem.
    await chamada(T, '2026-03-13', [[joana, false]], true);
    await periodo(joana, '2026-03-20', '2026-03-25', true);

    const corpo = await chamadaDaTurma(token, T);
    expect(corpo.alertaEvasao).toEqual({ percentual: 15, minimoDeAulas: 10 });
    expect(corpo.students).toEqual([
      expect.objectContaining({
        id: joana,
        aulas: 12,
        faltasNaoJustificadas: 1,
        justificativasPorPeriodo: [{ inicio: '2026-03-07', fim: '2026-03-07' }],
      }),
    ]);
  });

  it('⚠️ quem entrou depois conta só as aulas dele (D2)', async () => {
    const C = await cursinho(15);
    const token = await gestor(C);
    const T = await turma(C);
    const antigo = await aluno(C, T);
    for (let d = 1; d <= 5; d++)
      await chamada(T, `2026-04-0${d}`, [[antigo, true]]);
    const novo = await aluno(C, T);
    await chamada(T, '2026-04-06', [
      [antigo, true],
      [novo, false],
    ]);

    const { students } = await chamadaDaTurma(token, T);
    const porId = Object.fromEntries(students.map((s: any) => [s.id, s]));
    expect(porId[antigo]).toMatchObject({ aulas: 6, faltasNaoJustificadas: 0 });
    expect(porId[novo]).toMatchObject({ aulas: 1, faltasNaoJustificadas: 1 });
  });

  it('cursinho sem alerta → alertaEvasao null, contagens vêm mesmo assim', async () => {
    const C = await cursinho(null);
    const token = await gestor(C);
    const T = await turma(C);
    const a = await aluno(C, T);
    await chamada(T, '2026-05-04', [[a, false]]);

    const corpo = await chamadaDaTurma(token, T);
    expect(corpo.alertaEvasao).toBeNull();
    expect(corpo.students[0]).toMatchObject({
      aulas: 1,
      faltasNaoJustificadas: 1,
      justificativasPorPeriodo: [],
    });
  });

  it('turma sem nenhuma chamada → zeros', async () => {
    const C = await cursinho(15);
    const token = await gestor(C);
    const T = await turma(C);
    await aluno(C, T);
    const { students } = await chamadaDaTurma(token, T);
    expect(students[0]).toMatchObject({ aulas: 0, faltasNaoJustificadas: 0 });
  });

  it('turma de outro cursinho segue 404', async () => {
    const A = await cursinho(15);
    const B = await cursinho(15);
    const tokenA = await gestor(A);
    const TB = await turma(B);
    await request(app.getHttpServer())
      .get(`/class/${TB}/attendance-record`)
      .set('Authorization', tokenA)
      .expect(404);
  });
});
