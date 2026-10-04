import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { AttendancePeriod } from 'src/modules/prepCourse/attendance/attendanceRecord/enum/attendance-period.enum';
import { ClassService } from 'src/modules/prepCourse/class/class.service';
import { CoursePeriodService } from 'src/modules/prepCourse/coursePeriod/course-period.service';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { StatusApplication } from 'src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { SubmissionService } from 'src/modules/vcnafacul-form/submission/submission.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as ExcelJS from 'exceljs';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { Collaborator } from 'src/modules/prepCourse/collaborator/collaborator.entity';
import CreateClassDtoInputFaker from './faker/create-class.dto.input.faker';
import { CreateCoursePeriodDtoInputFaker } from './faker/create-course-period.dto.input.faker';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

describe('AttendanceRecord (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let studentCourseService: StudentCourseService;
  let studentCourseRepository: StudentCourseRepository;
  let partnerPrepCourseService: PartnerPrepCourseService;
  let geoService: GeoService;
  let inscriptionCourseService: InscriptionCourseService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let blobService: BlobService;
  let classService: ClassService;
  let coursePeriodService: CoursePeriodService;
  let submissionService: SubmissionService;
  let cacheService: CacheService;
  let logPartnerRepository: LogPartnerRepository;
  let logGeoRepository: LogGeoRepository;

  const discordWebhookMock = {
    sendMessage: jest.fn(),
  };

  const formServiceMock = {
    hasActiveForm: jest.fn().mockResolvedValue(true),
    createFormFull: jest.fn().mockResolvedValue('hashKeyFile'),
    getFormFullByInscriptionId: jest.fn().mockResolvedValue('hashKeyFile'),
    createPartnerForm: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideProvider(DiscordWebhook)
      .useValue(discordWebhookMock)
      .overrideProvider(FormService)
      .useValue(formServiceMock)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    emailService = moduleFixture.get<EmailService>(EmailService);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );
    studentCourseService =
      moduleFixture.get<StudentCourseService>(StudentCourseService);
    studentCourseRepository = moduleFixture.get<StudentCourseRepository>(
      StudentCourseRepository,
    );
    partnerPrepCourseService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    geoService = moduleFixture.get<GeoService>(GeoService);
    inscriptionCourseService = moduleFixture.get<InscriptionCourseService>(
      InscriptionCourseService,
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    blobService = moduleFixture.get<BlobService>('BlobService');
    classService = moduleFixture.get<ClassService>(ClassService);
    coursePeriodService =
      moduleFixture.get<CoursePeriodService>(CoursePeriodService);
    cacheService = moduleFixture.get<CacheService>(CacheService);
    submissionService = moduleFixture.get<SubmissionService>(SubmissionService);

    logPartnerRepository =
      moduleFixture.get<LogPartnerRepository>(LogPartnerRepository);
    logGeoRepository = moduleFixture.get<LogGeoRepository>(LogGeoRepository);

    jest
      .spyOn(logPartnerRepository, 'create')
      .mockImplementation(async () => ({}) as any);

    jest
      .spyOn(logGeoRepository, 'create')
      .mockImplementation(async () => ({}) as any);

    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});

    jest
      .spyOn(emailService, 'sendDeclaredInterest')
      .mockImplementation(async () => {});

    jest
      .spyOn(emailService, 'sendDeclaredInterestBulk')
      .mockImplementation(async () => {});

    jest
      .spyOn(emailService, 'sendConfirmationStudentRegister')
      .mockImplementation(async () => {});

    jest
      .spyOn(blobService, 'uploadFile')
      .mockImplementation(async () => 'hashKeyFile');

    jest
      .spyOn(studentCourseService['discordWebhook'], 'sendMessage')
      .mockImplementation(async () => {});

    jest
      .spyOn(submissionService, 'createSubmission')
      .mockImplementation(async () => 'hashKeyFile');

    jest.spyOn(cacheService, 'set').mockImplementation(async () => {});

    await app.init();

    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function createUserRepresentative() {
    const userRepresentativeDto = CreateUserDtoInputFaker();
    await userService.create(userRepresentativeDto);
    const userRepresentative = await userRepository.findOneBy({
      email: userRepresentativeDto.email,
    });
    const admin = await roleService.findOneBy({ name: 'admin' });
    userRepresentative.role = admin;
    await userRepository.update(userRepresentative);

    return userRepresentative;
  }

  async function createPartnerPrepCourse() {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representative = await createUserRepresentative();

    const partnerPrepCourse = await partnerPrepCourseService.create(
      {
        geoId: geo.id,
        representative: representative.id,
      },
      representative.id,
    );
    partnerPrepCourse.geo = {
      id: geo.id,
      name: geo.name,
      category: geo.category,
      street: geo.street,
      number: geo.number,
      complement: geo.complement,
      neighborhood: geo.neighborhood,
      state: geo.state,
      city: geo.city,
    };

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );
    return {
      representative,
      partnerPrepCourse,
      inscription,
      token,
    };
  }

  async function createStudent(inscriptionId: string) {
    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });
    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionId,
    );

    return await studentCourseService.create(studentDto);
  }

  async function createClass(userId: string, className?: string) {
    // Primeiro, obter o partnerPrepCourse do usuário
    const partnerPrepCourse =
      await partnerPrepCourseService.getByUserId(userId);
    if (!partnerPrepCourse) {
      throw new Error('Partner prep course not found for user');
    }

    // Criar um período letivo
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();
    const coursePeriod = await coursePeriodService.create(
      coursePeriodDto,
      userId,
    );

    // Criar a turma com o período letivo
    const classDto = CreateClassDtoInputFaker(className);
    classDto.coursePeriodId = coursePeriod.id;

    return await classService.create(classDto, userId);
  }

  async function confirmEnrollmentWithClass(
    studentId: string,
    representativeId: string,
  ) {
    // Cria a turma
    const classEntity = await createClass(representativeId);

    // Confirma a matrícula com o ID da turma
    await studentCourseService.confirmEnrolled(studentId, classEntity.id);

    return classEntity;
  }

  // Data fixa: o período letivo criado pelo faker sempre termina em anos
  // futuros, e usar uma data fixa evita depender do ano sorteado.
  const DIA_DO_REGISTRO = '2026-03-10';

  async function criarTurmaComAlunoEFrequencia({
    whatsapp,
    urgencyPhone,
  }: {
    whatsapp: string | null;
    urgencyPhone: string | null;
  }) {
    const { representative, inscription, token } =
      await createPartnerPrepCourse();

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);
    const classEntity = await confirmEnrollmentWithClass(
      student.id,
      representative.id,
    );

    // whatsapp/urgencyPhone vem preenchido pelo faker; `null` (e nao
    // `undefined`) e o que de fato limpa a coluna no save do TypeORM.
    const enrolled = await studentCourseService.findOneBy({ id: studentId });
    enrolled.whatsapp = whatsapp;
    enrolled.urgencyPhone = urgencyPhone;
    await studentCourseRepository.update(enrolled);

    await request(app.getHttpServer())
      .post('/attendance-record')
      .send({
        classId: classEntity.id,
        date: DIA_DO_REGISTRO,
        period: AttendancePeriod.MANHA,
        studentIds: [enrolled.id],
      })
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    return {
      representative,
      token,
      student: enrolled,
      classEntity,
      dia: DIA_DO_REGISTRO,
    };
  }

  it('summarybystudent deve retornar whatsapp e urgencyPhone do estudante', async () => {
    const { token, classEntity, dia } = await criarTurmaComAlunoEFrequencia({
      whatsapp: '11999998888',
      urgencyPhone: '11977776666',
    });

    const response = await request(app.getHttpServer())
      .get(
        `/attendance-record/summarybystudent?classId=${classEntity.id}&startDate=${dia}&endDate=${dia}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.report).toHaveLength(1);
    expect(response.body.report[0].whatsapp).toBe('11999998888');
    expect(response.body.report[0].urgencyPhone).toBe('11977776666');
  }, 100000);

  it('summarybystudent deve funcionar com estudante sem contatos', async () => {
    const { token, classEntity, dia } = await criarTurmaComAlunoEFrequencia({
      whatsapp: null,
      urgencyPhone: null,
    });

    const response = await request(app.getHttpServer())
      .get(
        `/attendance-record/summarybystudent?classId=${classEntity.id}&startDate=${dia}&endDate=${dia}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.report).toHaveLength(1);
    expect(response.body.report[0].whatsapp).toBeNull();
    expect(response.body.report[0].urgencyPhone).toBeNull();
  }, 100000);

  it('export deve trazer as colunas de contato alinhadas com os dias', async () => {
    const { token, classEntity, dia } = await criarTurmaComAlunoEFrequencia({
      whatsapp: '11999998888',
      urgencyPhone: '11977776666',
    });

    const response = await request(app.getHttpServer())
      .get(
        `/attendance-record/export?classId=${classEntity.id}&startDate=${dia}&endDate=${dia}&maxAbsencePercent=25`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    const sheet = workbook.worksheets[0];

    // a planilha tem linhas de preambulo (turma/periodo/limite) antes do
    // cabecalho: localiza a linha de cabecalho pela primeira coluna
    let headerRowNumber = 0;
    sheet.eachRow((row, rowNumber) => {
      if (!headerRowNumber && (row.values as string[])[1] === 'Matrícula') {
        headerRowNumber = rowNumber;
      }
    });
    expect(headerRowNumber).toBeGreaterThan(0);

    const header = sheet.getRow(headerRowNumber).values as string[];
    const linha = sheet.getRow(headerRowNumber + 1).values as string[];

    // values do exceljs e 1-indexed: a posicao 0 vem vazia
    expect(header[4]).toBe('Contato (WhatsApp)');
    expect(header[5]).toBe('Contato de Referência');
    expect(linha[4]).toBe('11999998888');
    expect(linha[5]).toBe('11977776666');

    // as colunas de percentual foram empurradas duas posicoes: se o header e a
    // linha nao tiverem sido alterados juntos, isto quebra
    expect(header[6]).toBe('% Presença');
    expect(linha[6]).toBe('100%'); // 1 registro, 1 presenca

    // as colunas de dia vem depois das fixas; header e linha tem que casar
    const idxDia = header.findIndex(
      (h) => typeof h === 'string' && h.includes('/'),
    );
    // 9 colunas fixas antes das datas (values do exceljs e 1-indexed)
    expect(idxDia).toBe(10);
    expect(linha[idxDia]).toBe('P');
  }, 100000);
  it('export deve manter o alinhamento quando so o whatsapp esta preenchido', async () => {
    // urgencyPhone nao e obrigatorio na inscricao: contato parcial e o caso
    // mais comum em producao e o unico que exercita o `?? ''` do export
    const { token, classEntity, dia } = await criarTurmaComAlunoEFrequencia({
      whatsapp: '11955554444',
      urgencyPhone: null,
    });

    const response = await request(app.getHttpServer())
      .get(
        `/attendance-record/export?classId=${classEntity.id}&startDate=${dia}&endDate=${dia}&maxAbsencePercent=25`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    const sheet = workbook.worksheets[0];

    let headerRowNumber = 0;
    sheet.eachRow((row, rowNumber) => {
      if (!headerRowNumber && (row.values as string[])[1] === 'Matrícula') {
        headerRowNumber = rowNumber;
      }
    });
    expect(headerRowNumber).toBeGreaterThan(0);

    const header = sheet.getRow(headerRowNumber).values as string[];
    const linha = sheet.getRow(headerRowNumber + 1).values as string[];

    // whatsapp preenchido, contato de referencia vazio pelo `?? ''`
    expect(linha[4]).toBe('11955554444');
    expect(linha[5]).toBe('');

    // a celula vazia nao pode colapsar e puxar as colunas seguintes
    expect(header[6]).toBe('% Presença');
    expect(linha[6]).toBe('100%');

    // 9 colunas fixas antes das datas (values do exceljs e 1-indexed)
    const idxDia = header.findIndex(
      (h) => typeof h === 'string' && h.includes('/'),
    );
    expect(idxDia).toBe(10);
    expect(linha[idxDia]).toBe('P');
  }, 100000);
  async function registrarFrequencia(
    token: string,
    classId: string,
    date: string,
    period: AttendancePeriod,
    studentIds: string[],
  ) {
    await request(app.getHttpServer())
      .post('/attendance-record')
      .send({ classId, date, period, studentIds })
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);
  }

  // Cria 5 registros numa ordem de insercao deliberadamente embaralhada, para
  // que a ordem retornada nao possa vir "de graca" da ordem de gravacao.
  async function criarTurmaComVariosRegistros() {
    const { token, student, classEntity } = await criarTurmaComAlunoEFrequencia(
      {
        whatsapp: null,
        urgencyPhone: null,
      },
    );

    // o fixture ja registrou 2026-03-10 MANHA
    await registrarFrequencia(
      token,
      classEntity.id,
      '2026-03-12',
      AttendancePeriod.TARDE,
      [student.id],
    );
    await registrarFrequencia(
      token,
      classEntity.id,
      '2026-03-08',
      AttendancePeriod.NOITE,
      [student.id],
    );
    await registrarFrequencia(
      token,
      classEntity.id,
      '2026-03-12',
      AttendancePeriod.MANHA,
      [student.id],
    );
    await registrarFrequencia(
      token,
      classEntity.id,
      '2026-03-11',
      AttendancePeriod.MANHA,
      [student.id],
    );

    return { token, student, classEntity };
  }

  const ORDEM_PERIODO = [
    AttendancePeriod.MANHA,
    AttendancePeriod.TARDE,
    AttendancePeriod.NOITE,
  ];

  it('student deve retornar os registros ordenados por registeredAt DESC com period como desempate', async () => {
    const { token, student } = await criarTurmaComVariosRegistros();

    const response = await request(app.getHttpServer())
      .get(`/attendance-record/student?studentId=${student.id}&page=1&limit=10`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const data = response.body.data;
    expect(data).toHaveLength(5);

    // Comparacoes relativas (e nao datas absolutas) para nao depender do
    // timezone com que o MySQL devolve a coluna datetime.
    for (let i = 1; i < data.length; i++) {
      const anterior = new Date(data[i - 1].registeredAt).getTime();
      const atual = new Date(data[i].registeredAt).getTime();
      expect(atual).toBeLessThanOrEqual(anterior);

      if (atual === anterior) {
        expect(ORDEM_PERIODO.indexOf(data[i].period)).toBeGreaterThan(
          ORDEM_PERIODO.indexOf(data[i - 1].period),
        );
      }
    }

    // o unico dia com dois registros e o 2026-03-12: MANHA tem que vir antes
    // de TARDE, que e o desempate que o ORDER BY precisa garantir.
    const empatados = data.filter(
      (r) =>
        new Date(r.registeredAt).getTime() ===
        new Date(data[0].registeredAt).getTime(),
    );
    expect(empatados.map((r) => r.period)).toEqual([
      AttendancePeriod.MANHA,
      AttendancePeriod.TARDE,
    ]);
  }, 100000);

  it('student deve paginar de forma deterministica, sem repetir nem omitir registros', async () => {
    const { token, student } = await criarTurmaComVariosRegistros();

    const buscarPagina = async (page: number, limit: number) => {
      const response = await request(app.getHttpServer())
        .get(
          `/attendance-record/student?studentId=${student.id}&page=${page}&limit=${limit}`,
        )
        .set({ Authorization: `Bearer ${token}` })
        .expect(200);
      return response.body.data as { id: string }[];
    };

    const completo = await buscarPagina(1, 10);
    const paginado = [
      ...(await buscarPagina(1, 2)),
      ...(await buscarPagina(2, 2)),
      ...(await buscarPagina(3, 2)),
    ];

    const idsPaginados = paginado.map((r) => r.id);
    expect(idsPaginados).toEqual(completo.map((r) => r.id));
    expect(new Set(idsPaginados).size).toBe(5);
  }, 100000);

  describe('editar presença: observação x justificativa (tickets-documentacao, 05)', () => {
    /** Registro com um aluno presente; devolve o id da presença dele. */
    const cenario = async () => {
      const { token, representative, student, classEntity } =
        await criarTurmaComAlunoEFrequencia({
          whatsapp: null,
          urgencyPhone: null,
        });
      const db = app.get(DataSource);
      const [sa] = await db.query(
        `SELECT sa.id, sa.attendanceRecordId AS recordId
           FROM student_attendance sa
           JOIN attendance_record ar ON ar.id = sa.attendanceRecordId
          WHERE ar.classId = ? AND sa.studentCourseId = ?`,
        [classEntity.id, student.id],
      );
      const editar = (body: object) =>
        request(app.getHttpServer())
          .patch('/student-attendance/present')
          .send({ id: sa.id, ...body })
          .set({ Authorization: `Bearer ${token}` });
      const estado = async () => {
        const [row] = await db.query(
          `SELECT sa.present, sa.observation, sa.observation_by AS por,
                  sa.observation_at AS em, aj.justification
             FROM student_attendance sa
             LEFT JOIN absence_justification aj ON aj.studentAttendanceId = sa.id
            WHERE sa.id = ?`,
          [sa.id],
        );
        return { ...row, present: !!Number(row.present) };
      };
      return { token, representative, recordId: sa.recordId, editar, estado };
    };

    it('sem observação não edita (nem só com espaços)', async () => {
      const { editar, estado } = await cenario();
      await editar({ present: false }).expect(400);
      await editar({ present: false, observation: '   ' }).expect(400);
      expect((await estado()).present).toBe(true);
    });

    it('⚠️ Presente → Ausente com observação e sem justificativa = falta COMUM', async () => {
      const { editar, estado, representative } = await cenario();
      await editar({
        present: false,
        observation: 'corrigindo chamada',
      }).expect(200);
      const e = await estado();
      expect(e).toMatchObject({
        present: false,
        observation: 'corrigindo chamada',
        por: representative.id,
        justification: null,
      });
      expect(e.em).not.toBeNull();
    });

    it('com justificativa = falta justificada; omitida mantém; vazia remove', async () => {
      const { editar, estado } = await cenario();
      await editar({
        present: false,
        observation: 'trouxe atestado',
        justification: 'Atestado médico',
      }).expect(200);
      expect((await estado()).justification).toBe('Atestado médico');

      await editar({ present: false, observation: 'só a observação' }).expect(
        200,
      );
      expect(await estado()).toMatchObject({
        observation: 'só a observação',
        justification: 'Atestado médico',
      });

      await editar({
        present: false,
        observation: 'justificada por engano',
        justification: '',
      }).expect(200);
      expect((await estado()).justification).toBeNull();
    });

    it('mudar para Presente remove a justificativa', async () => {
      const { editar, estado } = await cenario();
      await editar({
        present: false,
        observation: 'faltou',
        justification: 'Atestado',
      }).expect(200);
      await editar({
        present: true,
        observation: 'estava presente',
        justification: 'ignorada',
      }).expect(200);
      expect(await estado()).toMatchObject({
        present: true,
        observation: 'estava presente',
        justification: null,
      });
    });

    it('o detalhe do registro mostra a observação, quem e quando', async () => {
      const { editar, token, recordId, representative } = await cenario();
      await editar({
        present: false,
        observation: 'corrigindo chamada',
      }).expect(200);
      const { body } = await request(app.getHttpServer())
        .get(`/attendance-record/${recordId}`)
        .set({ Authorization: `Bearer ${token}` })
        .expect(200);
      // `present` já vinha como tinyint (0/1) nesta rota.
      expect(Number(body.studentAttendance[0].present)).toBe(0);
      expect(body.studentAttendance[0]).toMatchObject({
        observation: {
          text: 'corrigindo chamada',
          by: `${representative.firstName} ${representative.lastName}`,
        },
      });
      expect(body.studentAttendance[0].justification).toBeUndefined();
    });
  });

  describe('excluir justificativa de período desfaz as faltas dela (tickets-documentacao, 06)', () => {
    it('retroativo + chamada futura + exclusão; individuais e alteradas à mão ficam', async () => {
      const { token, student, classEntity } =
        await criarTurmaComAlunoEFrequencia({
          whatsapp: null,
          urgencyPhone: null,
        });
      const db = app.get(DataSource);
      // O faker sorteia o período letivo; fixa um que contém março/2026.
      await db.query(
        `UPDATE course_periods cp JOIN classes c ON c.course_period_id = cp.id
            SET cp.startDate = '2026-01-01', cp.endDate = '2030-12-31'
          WHERE c.id = ?`,
        [classEntity.id],
      );
      const auth = { Authorization: `Bearer ${token}` };
      const falta = (dia: string) =>
        registrarFrequencia(
          token,
          classEntity.id,
          dia,
          AttendancePeriod.MANHA,
          [],
        );
      /** Dia → justificativa da falta do aluno (null = falta comum). */
      const justificativas = async () => {
        const linhas: { dia: string; j: string | null }[] = await db.query(
          `SELECT DATE_FORMAT(ar.registeredAt, '%Y-%m-%d') AS dia, aj.justification AS j
             FROM student_attendance sa
             JOIN attendance_record ar ON ar.id = sa.attendanceRecordId
             LEFT JOIN absence_justification aj ON aj.studentAttendanceId = sa.id
            WHERE sa.studentCourseId = ? AND sa.present = 0`,
          [student.id],
        );
        return Object.fromEntries(linhas.map((l) => [l.dia, l.j]));
      };
      const presencaDoDia = async (dia: string) => {
        const [r] = await db.query(
          `SELECT sa.id, ar.id AS recordId FROM student_attendance sa
             JOIN attendance_record ar ON ar.id = sa.attendanceRecordId
            WHERE sa.studentCourseId = ? AND DATE(ar.registeredAt) = ?`,
          [student.id, dia],
        );
        return r as { id: string; recordId: string };
      };

      await falta('2026-03-02');
      await falta('2026-03-03');
      // Individual antes do período: não é cópia, não pode sumir.
      await request(app.getHttpServer())
        .patch('/student-attendance/present')
        .set(auth)
        .send({
          id: (await presencaDoDia('2026-03-03')).id,
          present: false,
          observation: 'trouxe declaração',
          justification: 'Consulta',
        })
        .expect(200);

      const { body: periodo } = await request(app.getHttpServer())
        .post('/period-justification')
        .set(auth)
        .send({
          studentCourseId: student.id,
          startDate: '2026-03-01',
          endDate: '2026-03-20',
          justification: 'Atestado',
        })
        .expect(201);

      await falta('2026-03-15'); // chamada futura: recebe a cópia
      await falta('2026-03-16');
      // Cópia com texto alterado à mão vira individual.
      await request(app.getHttpServer())
        .patch('/student-attendance/justification')
        .set(auth)
        .send({
          studentCourseId: student.id,
          attendanceRecordIds: [(await presencaDoDia('2026-03-16')).recordId],
          justification: 'Atestado (corrigido)',
        })
        .expect(200);

      expect(await justificativas()).toEqual({
        '2026-03-02': 'Atestado',
        '2026-03-03': 'Consulta',
        '2026-03-15': 'Atestado',
        '2026-03-16': 'Atestado (corrigido)',
      });

      const { body: lista } = await request(app.getHttpServer())
        .get(`/period-justification?studentCourseId=${student.id}`)
        .set(auth)
        .expect(200);
      expect(lista.data[0]).toMatchObject({
        id: periodo.id,
        faltasJustificadas: 2,
      });

      await request(app.getHttpServer())
        .delete(`/period-justification/${periodo.id}`)
        .set(auth)
        .expect(200);

      expect(await justificativas()).toEqual({
        '2026-03-02': null,
        '2026-03-03': 'Consulta',
        '2026-03-15': null,
        '2026-03-16': 'Atestado (corrigido)',
      });

      // Excluída, deixa de valer para as chamadas seguintes também.
      await falta('2026-03-17');
      expect((await justificativas())['2026-03-17']).toBeNull();
    }, 100000);
  });

  describe('chamada é gestão: exige Gerenciar Turmas (tickets-documentacao, 08)', () => {
    it('só Visualizar Turmas: não cria nem lê chamada; o registro do aluno segue aberto', async () => {
      const { representative, student, classEntity } =
        await criarTurmaComAlunoEFrequencia({
          whatsapp: null,
          urgencyPhone: null,
        });
      const db = app.get(DataSource);
      const [registro] = await db.query(
        `SELECT id FROM attendance_record WHERE classId = ?`,
        [classEntity.id],
      );
      const cursinho = await partnerPrepCourseService.getByUserId(
        representative.id,
      );

      /** Colaborador do cursinho com uma função nova; devolve o token. */
      const membro = async (permissoes: object) => {
        const funcao = await partnerPrepCourseService.createRole(
          {
            name: `Função ${Date.now()}-${Math.random()}`,
            base: false,
            ...permissoes,
          } as any,
          representative.id,
        );
        const dto = CreateUserDtoInputFaker();
        await userService.create(dto);
        const user = await userRepository.findOneBy({ email: dto.email });
        user.role = funcao as any;
        await userRepository.update(user);
        await db.getRepository(Collaborator).save(
          Object.assign(new Collaborator(), {
            user,
            partnerPrepCourse: { id: cursinho.id },
            actived: true,
          }),
        );
        return jwtService.signAsync({ user: { id: user.id } });
      };
      const monitor = await membro({ visualizarTurmas: true });
      const gestor = await membro({
        visualizarTurmas: true,
        gerenciarTurmas: true,
      });

      const chamada = (t: string) =>
        request(app.getHttpServer())
          .post('/attendance-record')
          .set({ Authorization: `Bearer ${t}` })
          .send({
            classId: classEntity.id,
            date: '2026-03-11',
            period: AttendancePeriod.MANHA,
            studentIds: [],
          });
      const get = (t: string, url: string) =>
        request(app.getHttpServer())
          .get(url)
          .set({ Authorization: `Bearer ${t}` });

      await chamada(monitor).expect(403);
      await get(monitor, `/class/${classEntity.id}/attendance-record`).expect(
        403,
      );
      await get(monitor, `/attendance-record?classId=${classEntity.id}`).expect(
        403,
      );
      await get(monitor, `/attendance-record/${registro.id}`).expect(403);
      // A janela do aluno é só leitura para quem visualiza (card 07).
      await get(
        monitor,
        `/attendance-record/student?studentId=${student.id}`,
      ).expect(200);

      await get(gestor, `/class/${classEntity.id}/attendance-record`).expect(
        200,
      );
      await chamada(gestor).expect(201);
      await get(gestor, `/attendance-record?classId=${classEntity.id}`).expect(
        200,
      );
      await get(gestor, `/attendance-record/${registro.id}`).expect(200);
    }, 100000);
  });

  describe('turma sem alunos matriculados (tickets-documentacao, 11)', () => {
    it('monta a chamada com a lista vazia e recusa criá-la, sem "turma não encontrada"', async () => {
      const { representative, token } = await createPartnerPrepCourse();
      const turma = await createClass(representative.id);
      const auth = { Authorization: `Bearer ${token}` };

      const { body } = await request(app.getHttpServer())
        .get(`/class/${turma.id}/attendance-record`)
        .set(auth)
        .expect(200);
      expect(body.id).toBe(turma.id);
      expect(body.students).toEqual([]);

      const { body: erro } = await request(app.getHttpServer())
        .post('/attendance-record')
        .set(auth)
        .send({
          classId: turma.id,
          date: '2026-03-10',
          period: AttendancePeriod.MANHA,
          studentIds: [],
        })
        .expect(400);
      expect(erro.message).toBe('Esta turma não tem alunos matriculados');

      const [{ n }] = await app
        .get(DataSource)
        .query(
          `SELECT COUNT(*) AS n FROM attendance_record WHERE classId = ?`,
          [turma.id],
        );
      expect(Number(n)).toBe(0);
    }, 100000);

    it('turma que não existe: "Turma não encontrada"', async () => {
      const { token } = await createPartnerPrepCourse();
      const { body } = await request(app.getHttpServer())
        .get('/class/00000000-0000-0000-0000-000000000000/attendance-record')
        .set({ Authorization: `Bearer ${token}` })
        .expect(404);
      expect(body.message).toBe('Turma não encontrada');
    }, 100000);
  });
});
