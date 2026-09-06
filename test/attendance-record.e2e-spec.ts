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
});
