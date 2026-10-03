import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { AttendanceRecordService } from 'src/modules/prepCourse/attendance/attendanceRecord/attendance-record.service';
import { AttendancePeriod } from 'src/modules/prepCourse/attendance/attendanceRecord/enum/attendance-period.enum';
import { ClassService } from 'src/modules/prepCourse/class/class.service';
import { CoursePeriodService } from 'src/modules/prepCourse/coursePeriod/course-period.service';
import { diaEmSaoPaulo } from 'src/modules/prepCourse/indicadores/datas';
import { IndicadorDiarioTurma } from 'src/modules/prepCourse/indicadores/indicador-diario-turma.entity';
import { IndicadoresRepository } from 'src/modules/prepCourse/indicadores/indicadores.repository';
import { IndicadoresTask } from 'src/modules/prepCourse/indicadores/indicadores.task';
import { preencherFotos } from 'src/modules/prepCourse/indicadores/preencher-fotos';
import { CalculoDosIndicadores } from 'src/modules/prepCourse/indicadores/calculo-dos-indicadores';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { StatusApplication } from 'src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { SubmissionService } from 'src/modules/vcnafacul-form/submission/submission.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import createFakeDocxBase64 from './utils/createFakeDocxBase64';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

/** `YYYY-MM-DD` de São Paulo, `n` dias a partir de hoje. */
const dia = (n = 0) =>
  diaEmSaoPaulo(new Date(Date.now() + n * 24 * 60 * 60 * 1000));

/** Indicadores do cursinho (tickets/033). */
describe('Indicadores do cursinho (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let jwt: JwtService;
  let userService: UserService;
  let userRepository: UserRepository;
  let roleService: RoleService;
  let geoService: GeoService;
  let partnerService: PartnerPrepCourseService;
  let periodService: CoursePeriodService;
  let classService: ClassService;
  let inscriptionService: InscriptionCourseService;
  let task: IndicadoresTask;
  let chamadaService: AttendanceRecordService;
  let calculo: CalculoDosIndicadores;
  let indicadoresRepository: IndicadoresRepository;
  let studentService: StudentCourseService;
  let studentRepository: StudentCourseRepository;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideProvider(FormService)
      .useValue({
        hasActiveForm: jest.fn().mockResolvedValue(true),
        createFormFull: jest.fn().mockResolvedValue('hashKeyFile'),
        getFormFullByInscriptionId: jest.fn().mockResolvedValue('hashKeyFile'),
        createPartnerForm: jest.fn().mockResolvedValue(undefined),
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(mod);
    db = mod.get(DataSource);
    jwt = mod.get(JwtService);
    userService = mod.get(UserService);
    userRepository = mod.get(UserRepository);
    roleService = mod.get(RoleService);
    geoService = mod.get(GeoService);
    partnerService = mod.get(PartnerPrepCourseService);
    periodService = mod.get(CoursePeriodService);
    classService = mod.get(ClassService);
    inscriptionService = mod.get(InscriptionCourseService);
    task = mod.get(IndicadoresTask);
    chamadaService = mod.get(AttendanceRecordService);
    calculo = mod.get(CalculoDosIndicadores);
    indicadoresRepository = mod.get(IndicadoresRepository);
    studentService = mod.get(StudentCourseService);
    studentRepository = mod.get(StudentCourseRepository);

    jest
      .spyOn(mod.get(LogPartnerRepository), 'create')
      .mockImplementation(async () => ({}) as any);
    jest
      .spyOn(mod.get(LogGeoRepository), 'create')
      .mockImplementation(async () => ({}) as any);
    const email = mod.get(EmailService);
    jest.spyOn(email, 'sendCreateUser').mockImplementation(async () => {});
    jest.spyOn(email, 'sendEmailGeo').mockImplementation(async () => {});
    const blob = mod.get<BlobService>('BlobService');
    jest.spyOn(blob, 'uploadFile').mockImplementation(async () => 'hashKey');
    jest
      .spyOn(blob, 'getFile')
      .mockImplementation(async (key: string) =>
        key === 'termo_template.docx'
          ? { buffer: createFakeDocxBase64() }
          : (Buffer.from('arquivo') as any),
      );
    jest
      .spyOn(mod.get(SubmissionService), 'createSubmission')
      .mockImplementation(async () => 'hashKey');

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const http = () => request(app.getHttpServer());

  /** Um papel com as permissões dadas (o resto false). */
  const papel = async (permissoes: Partial<CreateRoleDtoInput>) => {
    const dto = Object.assign(new CreateRoleDtoInput(), permissoes);
    dto.name = `indicadores_${Date.now()}_${Math.random()}`;
    return roleService.create(dto);
  };

  /** Cursinho novo, com o gestor logado (`bearer`). */
  const novoCursinho = async (
    permissoes: Partial<CreateRoleDtoInput> = {
      visualizarEstudantes: true,
      gerenciarTurmas: true,
    },
  ) => {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });
    user.role = await papel(permissoes);
    await userRepository.update(user);
    const cursinho = await partnerService.create(
      { geoId: geo.id, representative: user.id },
      user.id,
    );
    const bearer = `Bearer ${await jwt.signAsync({ user: { id: user.id } }, { expiresIn: '2h' })}`;
    const inscricao = await inscriptionService.create(
      CreateInscriptionCourseDTOInputFaker(),
      user.id,
    );
    return { user, cursinho, bearer, inscricaoId: inscricao.id };
  };

  type Cursinho = Awaited<ReturnType<typeof novoCursinho>>;

  const novoPeriodo = async (
    c: Cursinho,
    inicio: string,
    fim: string,
    nome = `Período ${inicio}`,
  ) =>
    periodService.create(
      { name: nome, startDate: inicio as any, endDate: fim as any },
      c.user.id,
    );

  const novaTurma = async (c: Cursinho, periodoId: string, nome = 'Turma') =>
    (
      await classService.create(
        { name: nome, description: 'turma', coursePeriodId: periodoId },
        c.user.id,
      )
    ).id;

  /** Estudante com a matrícula confirmada na turma. */
  const matricular = async (c: Cursinho, turmaId: string) => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const aluno = await userRepository.findOneBy({ email: userDto.email });
    const dto = createStudentCourseDTOInputFaker(aluno.id, c.inscricaoId);
    dto.rg = '45.678.123-4';
    const { id } = await studentService.create(dto);
    const criado = await studentService.findOneBy({ id });
    criado.applicationStatus = StatusApplication.DeclaredInterest;
    await studentRepository.update(criado);
    await studentService.confirmEnrolled(id, turmaId);
    return id;
  };

  /** Inscrito que nunca teve a matrícula confirmada. */
  const inscrever = async (c: Cursinho, turmaId: string) => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const aluno = await userRepository.findOneBy({ email: userDto.email });
    const dto = createStudentCourseDTOInputFaker(aluno.id, c.inscricaoId);
    dto.rg = '45.678.123-4';
    const { id } = await studentService.create(dto);
    await db.query('UPDATE student_course SET classId = ? WHERE id = ?', [
      turmaId,
      id,
    ]);
    return id;
  };

  /** Afasta no tempo os logs de um aluno (para testar "até o dia D"). */
  const recuarLogs = async (alunoId: string, dias: number, status?: string) =>
    db.query(
      `UPDATE log_student SET created_at = DATE_SUB(created_at, INTERVAL ? DAY)
        WHERE student_id = ?${status ? ' AND applicationStatus = ?' : ''}`,
      status ? [dias, alunoId, status] : [dias, alunoId],
    );

  /** Métricas de uma turma no dia, pela conta única. */
  const metricasDaTurma = async (turmaId: string, d = dia()) =>
    (await calculo.calcular([turmaId], d)).get(turmaId);

  /** Faz a chamada do dia: presentes = os da lista. */
  const chamada = async (
    c: Cursinho,
    turmaId: string,
    d: string,
    presentes: string[],
    period = AttendancePeriod.MANHA,
  ) =>
    chamadaService.create(
      { classId: turmaId, date: d as any, period, studentIds: presentes },
      c.user.id,
    );

  /** Justifica a falta do aluno naquela chamada. */
  const justificar = (chamadaId: string, alunoId: string) =>
    db.query(
      `INSERT INTO absence_justification (id, justification, studentAttendanceId)
       SELECT UUID(), 'atestado', sa.id FROM student_attendance sa
        WHERE sa.attendanceRecordId = ? AND sa.studentCourseId = ?`,
      [chamadaId, alunoId],
    );

  const indicadores = (c: Cursinho, periodoId: string) =>
    http()
      .get(`/indicadores?periodoId=${periodoId}`)
      .set('Authorization', c.bearer);

  const fotos = (turmaId: string) =>
    db
      .getRepository(IndicadorDiarioTurma)
      .find({ where: { classId: turmaId }, order: { dia: 'ASC' } });

  describe('tela (card 01)', () => {
    it('⚠️ sem visualizar/gerenciar estudantes → 403 nas duas rotas', async () => {
      const c = await novoCursinho({ gerenciarTurmas: true });
      const p = await novoPeriodo(c, dia(-10), dia(10));
      await http()
        .get('/indicadores/periodos')
        .set('Authorization', c.bearer)
        .expect(403);
      await indicadores(c, p.id).expect(403);
    });

    it('gerenciarEstudantes sozinho também abre', async () => {
      const c = await novoCursinho({
        gerenciarEstudantes: true,
        gerenciarTurmas: true,
      });
      await http()
        .get('/indicadores/periodos')
        .set('Authorization', c.bearer)
        .expect(200);
    });

    it('lista só os períodos do cursinho, do mais recente, com "em andamento" e turmas sem período', async () => {
      const c = await novoCursinho();
      const antigo = await novoPeriodo(c, dia(-400), dia(-200), 'Antigo');
      const atual = await novoPeriodo(c, dia(-10), dia(30), 'Atual');
      await novaTurma(c, atual.id);
      const semPeriodo = await novaTurma(c, antigo.id, 'Sem período');
      await db.query(
        'UPDATE classes SET course_period_id = NULL WHERE id = ?',
        [semPeriodo],
      );
      const outro = await novoCursinho();
      await novoPeriodo(outro, dia(-5), dia(5), 'De outro');

      const { body } = await http()
        .get('/indicadores/periodos')
        .set('Authorization', c.bearer)
        .expect(200);

      expect(body.periodos.map((p) => p.nome)).toEqual(['Atual', 'Antigo']);
      expect(body.periodos[0]).toMatchObject({
        id: atual.id,
        inicio: dia(-10),
        fim: dia(30),
        emAndamento: true,
      });
      expect(body.periodos[1].emAndamento).toBe(false);
      expect(body.turmasSemPeriodo).toBe(1);
    });

    it('⚠️ período de outro cursinho → 404; id inválido → 400', async () => {
      const c = await novoCursinho();
      const outro = await novoCursinho();
      const p = await novoPeriodo(outro, dia(-10), dia(10));
      await indicadores(c, p.id).expect(404);
      await indicadores(c, 'nao-e-uuid').expect(400);
    });

    it('devolve as turmas do período e o ponto de hoje na série', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-10), dia(10));
      const a = await novaTurma(c, p.id, 'A');
      const b = await novaTurma(c, p.id, 'B');

      const { body } = await indicadores(c, p.id).expect(200);

      expect(body.periodo).toMatchObject({ id: p.id, emAndamento: true });
      expect(body.turmas.map((t) => [t.id, t.nome])).toEqual([
        [a, 'A'],
        [b, 'B'],
      ]);
      expect(body.serie.map((s) => s.dia)).toEqual([dia()]);
      expect(Date.parse(body.atualizadoEm)).not.toBeNaN();
    });

    it('cron: uma foto por turma de período aberto; rodar de novo não duplica; período encerrado não ganha foto', async () => {
      const c = await novoCursinho();
      const aberto = await novoPeriodo(c, dia(-10), dia(10));
      const encerrado = await novoPeriodo(c, dia(-60), dia(-20));
      const turmaAberta = await novaTurma(c, aberto.id);
      const turmaEncerrada = await novaTurma(c, encerrado.id);

      await task.fotografar();
      await task.fotografar();

      const doAberto = await fotos(turmaAberta);
      expect(doAberto).toHaveLength(1);
      expect(String(doAberto[0].dia).slice(0, 10)).toBe(dia());
      expect(doAberto[0]).toMatchObject({
        partnerPrepCourseId: c.cursinho.id,
        coursePeriodId: aberto.id,
        versao: 1,
      });
      expect(await fotos(turmaEncerrada)).toHaveLength(0);
    });

    it('⚠️ cron: período que começa ou termina hoje também ganha a foto', async () => {
      const c = await novoCursinho();
      const terminaHoje = await novaTurma(
        c,
        (await novoPeriodo(c, dia(-30), dia())).id,
      );
      const comecaHoje = await novaTurma(
        c,
        (await novoPeriodo(c, dia(), dia(30))).id,
      );

      await task.fotografar();

      expect(await fotos(terminaHoje)).toHaveLength(1);
      expect(await fotos(comecaHoje)).toHaveLength(1);
    });
  });
  describe('quantos alunos temos? (card 02)', () => {
    it('conta quem teve a matrícula confirmada: matriculado, cancelado e encerrado; não o inscrito', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      await matricular(c, t);
      await matricular(c, t);
      const cancelado = await matricular(c, t);
      const encerrado = await matricular(c, t);
      await studentService.cancelEnrolled(cancelado, 'Rotina');
      await db.query(
        'UPDATE student_course SET applicationStatus = ? WHERE id = ?',
        [StatusApplication.EnrollmentClosed, encerrado],
      );
      await inscrever(c, t);

      const { body } = await indicadores(c, p.id).expect(200);

      expect(body.turmas[0].metricas.alunos).toBe(4);
      expect(body.cursinho.alunos).toBe(4);
    });

    it('soma as turmas no cursinho; aluno de outro cursinho nunca entra', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const a = await novaTurma(c, p.id, 'A');
      const b = await novaTurma(c, p.id, 'B');
      await matricular(c, a);
      await matricular(c, b);
      await matricular(c, b);
      const outro = await novoCursinho();
      const po = await novoPeriodo(outro, dia(-30), dia(30));
      await matricular(outro, await novaTurma(outro, po.id));

      const { body } = await indicadores(c, p.id).expect(200);

      expect(body.turmas.map((t) => t.metricas.alunos)).toEqual([1, 2]);
      expect(body.cursinho.alunos).toBe(3);
    });

    it('⚠️ pela data da matrícula: quem foi matriculado há 5 dias não conta 6 dias atrás', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      const aluno = await matricular(c, t);
      await recuarLogs(aluno, 5);

      expect((await metricasDaTurma(t, dia(-6))).alunos).toBe(0);
      expect((await metricasDaTurma(t, dia(-5))).alunos).toBe(1);
    });

    it('a foto do dia bate com o número ao vivo', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      await matricular(c, t);
      await matricular(c, t);

      await task.fotografar();
      const [foto] = await fotos(t);
      const { body } = await indicadores(c, p.id).expect(200);

      expect(foto.metricas.alunos).toBe(2);
      expect(body.turmas[0].metricas.alunos).toBe(foto.metricas.alunos);
    });
  });
  describe('quantos estão ativos? (card 03)', () => {
    /** Matriculado há 20 dias e cancelado há `ha` dias. */
    const canceladoHa = async (c: Cursinho, t: string, ha: number) => {
      const aluno = await matricular(c, t);
      await recuarLogs(aluno, 20);
      await studentService.cancelEnrolled(aluno, 'Rotina');
      await recuarLogs(aluno, ha, StatusApplication.EnrollmentCancelled);
      return aluno;
    };

    it('cancelado em D conta como ativo em D-1 e não em D', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      await recuarLogs(await matricular(c, t), 20);
      await canceladoHa(c, t, 10);

      expect(await metricasDaTurma(t, dia(-11))).toMatchObject({
        alunos: 2,
        ativos: 2,
      });
      expect(await metricasDaTurma(t, dia(-10))).toMatchObject({
        alunos: 2,
        ativos: 1,
      });
    });

    it('cancelado e reativado volta a contar a partir da reativação', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      const aluno = await canceladoHa(c, t, 10);
      await studentService.activeEnrolled(aluno);
      await db.query(
        `UPDATE log_student SET created_at = DATE_SUB(created_at, INTERVAL 5 DAY)
          WHERE student_id = ? AND description = 'Matrícula reativada'`,
        [aluno],
      );

      expect((await metricasDaTurma(t, dia(-6))).ativos).toBe(0);
      expect((await metricasDaTurma(t, dia(-5))).ativos).toBe(1);
      expect((await metricasDaTurma(t)).ativos).toBe(1);
    });

    it('⚠️ período encerrado: ativos = quem chegou ao último dia, mesmo com todos "encerrados"', async () => {
      const c = await novoCursinho();
      // a matrícula só aceita turma de período aberto: matricula e depois
      // empurra o período para o passado
      const p = await novoPeriodo(c, dia(-40), dia(30));
      const t = await novaTurma(c, p.id);
      for (const a of [await matricular(c, t), await matricular(c, t)])
        await recuarLogs(a, 30);
      await canceladoHa(c, t, 15);
      await db.query('UPDATE course_periods SET endDate = ? WHERE id = ?', [
        new Date(`${dia(-10)}T00:00:00Z`),
        p.id,
      ]);
      // o fechamento do período (status, sem passar pelo cron)
      await db.query(
        `UPDATE student_course SET applicationStatus = ? WHERE classId = ?
            AND applicationStatus = ?`,
        [StatusApplication.EnrollmentClosed, t, StatusApplication.Enrolled],
      );

      const { body } = await indicadores(c, p.id).expect(200);

      expect(body.periodo.emAndamento).toBe(false);
      expect(body.cursinho).toMatchObject({ alunos: 3, ativos: 2 });
    });

    it('backfill: grava os dias passados; rodar de novo não grava nada; --sobrescrever regrava', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-3), dia(30));
      const t = await novaTurma(c, p.id);
      await canceladoHa(c, t, 2);

      const seco = await preencherFotos(indicadoresRepository, calculo, {
        periodoId: p.id,
      });
      expect(seco).toEqual({ periodos: 1, linhas: 3 });
      expect(await fotos(t)).toHaveLength(0);

      await preencherFotos(indicadoresRepository, calculo, {
        periodoId: p.id,
        aplicar: true,
      });
      const gravadas = await fotos(t);
      expect(gravadas.map((f) => String(f.dia).slice(0, 10))).toEqual([
        dia(-3),
        dia(-2),
        dia(-1),
      ]);
      expect(gravadas.map((f) => f.metricas.ativos)).toEqual([1, 0, 0]);

      expect(
        await preencherFotos(indicadoresRepository, calculo, {
          periodoId: p.id,
          aplicar: true,
        }),
      ).toEqual({ periodos: 1, linhas: 0 });
      expect(
        await preencherFotos(indicadoresRepository, calculo, {
          periodoId: p.id,
          sobrescrever: true,
        }),
      ).toEqual({ periodos: 1, linhas: 3 });

      // a série da tela usa as fotos + o ponto de hoje
      const { body } = await indicadores(c, p.id).expect(200);
      expect(body.serie.map((s) => s.metricas.ativos)).toEqual([1, 0, 0, 0]);
    });
  });
  describe('quantos abandonaram? (card 04)', () => {
    it('conta cancelamentos por motivo; "Outros: ..." vira Outros; texto antigo, "Sem motivo na lista"', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const a = await novaTurma(c, p.id, 'A');
      const b = await novaTurma(c, p.id, 'B');
      await matricular(c, a);
      const motivos = [
        [a, 'Transporte'],
        [a, 'Desistência inicial'],
        [b, 'Outros: mudou de cidade'],
        [b, 'foi embora'],
        [b, 'Transporte'],
      ];
      for (const [turma, motivo] of motivos) {
        const aluno = await matricular(c, turma);
        await studentService.cancelEnrolled(aluno, motivo);
      }

      const { body } = await indicadores(c, p.id).expect(200);

      expect(body.cursinho).toMatchObject({
        alunos: 6,
        ativos: 1,
        cancelados: 5,
        desistenciaInicial: 1,
        canceladosPorMotivo: {
          Transporte: 2,
          'Desistência inicial': 1,
          Outros: 1,
          'Sem motivo na lista': 1,
        },
      });
      expect(body.turmas[0].metricas.cancelados).toBe(2);
    });

    it('reativado não conta; vale o motivo do último cancelamento', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      const reativado = await matricular(c, t);
      await studentService.cancelEnrolled(reativado, 'Rotina');
      await recuarLogs(reativado, 1);
      await studentService.activeEnrolled(reativado);
      const duasVezes = await matricular(c, t);
      await studentService.cancelEnrolled(duasVezes, 'Rotina');
      await recuarLogs(duasVezes, 2);
      await studentService.activeEnrolled(duasVezes);
      await recuarLogs(duasVezes, 1, StatusApplication.Enrolled);
      await studentService.cancelEnrolled(duasVezes, 'Abandono');

      const m = await metricasDaTurma(t);

      expect(m).toMatchObject({
        cancelados: 1,
        canceladosPorMotivo: { Abandono: 1 },
      });
    });

    it('⚠️ período encerrado mantém os cancelamentos (pelo histórico, não pelo status)', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-40), dia(30));
      const t = await novaTurma(c, p.id);
      const aluno = await matricular(c, t);
      await studentService.cancelEnrolled(aluno, 'Rotina');
      await recuarLogs(aluno, 20);
      await db.query('UPDATE course_periods SET endDate = ? WHERE id = ?', [
        new Date(`${dia(-10)}T00:00:00Z`),
        p.id,
      ]);
      // como o cron antigo deixava: cancelado vira "Encerrada"
      await db.query(
        'UPDATE student_course SET applicationStatus = ? WHERE id = ?',
        [StatusApplication.EnrollmentClosed, aluno],
      );

      const { body } = await indicadores(c, p.id).expect(200);

      expect(body.cursinho).toMatchObject({
        cancelados: 1,
        canceladosPorMotivo: { Rotina: 1 },
      });
    });
  });
  describe('qual a frequência média? (card 07)', () => {
    it('⚠️ soma presenças e chamadas das turmas: 90/100 + 10/20 → 83,3%, não a média 70%', async () => {
      // escala menor, mesma proporção: A = 9/10, B = 1/2
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const a = await novaTurma(c, p.id, 'A');
      const b = await novaTurma(c, p.id, 'B');
      const deA = [];
      for (let i = 0; i < 5; i++) deA.push(await matricular(c, a));
      const deB = [await matricular(c, b), await matricular(c, b)];
      await chamada(c, a, dia(-2), deA); // 5 de 5
      await chamada(c, a, dia(-1), deA.slice(0, 4)); // 4 de 5
      await chamada(c, b, dia(-1), deB.slice(0, 1)); // 1 de 2

      const { body } = await indicadores(c, p.id).expect(200);

      expect(body.turmas.map((t) => t.metricas)).toEqual([
        expect.objectContaining({
          presencas: 9,
          chamadasAluno: 10,
          aulasRegistradas: 2,
        }),
        expect.objectContaining({
          presencas: 1,
          chamadasAluno: 2,
          aulasRegistradas: 1,
        }),
      ]);
      expect(body.cursinho).toMatchObject({ presencas: 10, chamadasAluno: 12 });
    });

    it('cancelado no meio não leva falta nas chamadas seguintes; falta justificada soma à parte', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      const fica = await matricular(c, t);
      const sai = await matricular(c, t);
      const primeira = await chamada(c, t, dia(-3), [fica]);
      await justificar(primeira.id, sai);
      await studentService.cancelEnrolled(sai, 'Rotina');
      await chamada(c, t, dia(-2), [fica]);

      const m = await metricasDaTurma(t);

      expect(m).toMatchObject({
        chamadasAluno: 3, // 2 na primeira + só quem ficou na segunda
        presencas: 2,
        faltasJustificadas: 1,
        aulasRegistradas: 2,
      });
    });

    it('pela data da chamada; chamada apagada não conta; turma sem chamada fica em zero', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      const vazia = await novaTurma(c, p.id, 'Sem chamada');
      const aluno = await matricular(c, t);
      await chamada(c, t, dia(-5), [aluno]);
      const apagada = await chamada(c, t, dia(-1), []);
      await chamadaService.delete(apagada.id);

      expect((await metricasDaTurma(t, dia(-6))).chamadasAluno).toBe(0);
      expect(await metricasDaTurma(t)).toMatchObject({
        chamadasAluno: 1,
        presencas: 1,
        aulasRegistradas: 1,
      });
      expect((await metricasDaTurma(vazia)).aulasRegistradas).toBe(0);
    });
  });
  describe('quem está sumindo? (card 08)', () => {
    /** Turma com 4 alunos e 3 chamadas; devolve os alunos pelo papel. */
    const cenario = async (permissoes?: Partial<CreateRoleDtoInput>) => {
      const c = await novoCursinho(permissoes);
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id, 'Noite');
      const sumiu = await matricular(c, t);
      const voltou = await matricular(c, t);
      const justificou = await matricular(c, t);
      const cancelado = await matricular(c, t);
      const presente = await matricular(c, t);
      const primeira = await chamada(c, t, dia(-6), [presente, sumiu]);
      await chamada(c, t, dia(-4), [presente]);
      const terceira = await chamada(c, t, dia(-3), [presente]);
      await chamada(c, t, dia(-1), [presente, voltou]);
      await justificar(terceira.id, justificou);
      await studentService.cancelEnrolled(cancelado, 'Rotina');
      return { c, p, t, sumiu, voltou, justificou, primeira };
    };

    it('ativo que faltou às 3 últimas aparece; quem veio, justificou ou cancelou, não', async () => {
      const { c, p, t, sumiu, justificou } = await cenario();

      expect((await metricasDaTurma(t)).sumindo).toBe(1);

      const { body } = await http()
        .get(`/indicadores/sumindo?periodoId=${p.id}`)
        .set('Authorization', c.bearer)
        .expect(200);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        alunoId: sumiu,
        turma: 'Noite',
        faltasSeguidas: 3,
        ultimaPresenca: dia(-6),
      });
      expect(body[0].alunoId).not.toBe(justificou);
      // sem gerenciarEstudantes: nem a chave do telefone vai
      expect(body[0]).not.toHaveProperty('telefone');
    });

    it('com gerenciarEstudantes a lista traz o telefone', async () => {
      const { c, p } = await cenario({
        gerenciarEstudantes: true,
        gerenciarTurmas: true,
      });
      const { body } = await http()
        .get(`/indicadores/sumindo?periodoId=${p.id}`)
        .set('Authorization', c.bearer)
        .expect(200);
      expect(body[0]).toHaveProperty('telefone');
    });

    it('turma com menos de 3 chamadas: ninguém aparece', async () => {
      const c = await novoCursinho();
      const p = await novoPeriodo(c, dia(-30), dia(30));
      const t = await novaTurma(c, p.id);
      await matricular(c, t);
      await chamada(c, t, dia(-2), []);
      await chamada(c, t, dia(-1), []);

      expect((await metricasDaTurma(t)).sumindo).toBe(0);
    });

    it('⚠️ período de outro cursinho → 404; período encerrado → lista vazia', async () => {
      const { p } = await cenario();
      const outro = await novoCursinho();
      await http()
        .get(`/indicadores/sumindo?periodoId=${p.id}`)
        .set('Authorization', outro.bearer)
        .expect(404);

      const { c, p: encerrado } = await cenario();
      await db.query('UPDATE course_periods SET endDate = ? WHERE id = ?', [
        new Date(`${dia(-1)}T00:00:00Z`),
        encerrado.id,
      ]);
      const { body } = await http()
        .get(`/indicadores/sumindo?periodoId=${encerrado.id}`)
        .set('Authorization', c.bearer)
        .expect(200);
      expect(body).toEqual([]);
    });
  });
});
