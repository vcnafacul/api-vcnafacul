import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { ClassRepository } from 'src/modules/prepCourse/class/class.repository';
import { CoursePeriodService } from 'src/modules/prepCourse/coursePeriod/course-period.service';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { CreateCoursePeriodDtoInputFaker } from './faker/create-course-period.dto.input.faker';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

describe('ClassAnalytics (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let geoService: GeoService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let partnerService: PartnerPrepCourseService;
  let emailService: EmailService;
  let classRepository: ClassRepository;
  let coursePeriodService: CoursePeriodService;
  let blobService: BlobService;
  let logPartnerRepository: LogPartnerRepository;
  let logGeoRepository: LogGeoRepository;

  // Role with both gerenciarTurmas and visualizarTurmas
  let analyticsRole: Role = null;

  const discordWebhookMock = {
    sendMessage: jest.fn(),
  };

  const formServiceMock = {
    hasActiveForm: jest.fn().mockResolvedValue(true),
    createFormFull: jest.fn().mockResolvedValue('hashKeyFile'),
    getFormFullByInscriptionId: jest.fn().mockResolvedValue('hashKeyFile'),
    createPartnerForm: jest.fn().mockResolvedValue(undefined),
  };

  const simuladoHttpMock = {
    listUserGroupAggregates: jest.fn().mockResolvedValue([]),
    getUserGroupAggregateByMonth: jest.fn().mockResolvedValue(null),
    calculateUserGroupAggregate: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService],
    })
      .overrideProvider(DiscordWebhook)
      .useValue(discordWebhookMock)
      .overrideProvider(FormService)
      .useValue(formServiceMock)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(SimuladoHttpService)
      .useValue(simuladoHttpMock)
      .overrideProvider(HttpServiceAxiosFactory)
      .useValue({ create: () => ({}) })
      .compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    geoService = moduleFixture.get<GeoService>(GeoService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    emailService = moduleFixture.get<EmailService>(EmailService);
    partnerService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    classRepository = moduleFixture.get<ClassRepository>(ClassRepository);
    coursePeriodService =
      moduleFixture.get<CoursePeriodService>(CoursePeriodService);
    blobService = moduleFixture.get<BlobService>('BlobService');
    logPartnerRepository =
      moduleFixture.get<LogPartnerRepository>(LogPartnerRepository);
    logGeoRepository = moduleFixture.get<LogGeoRepository>(LogGeoRepository);

    jest.spyOn(emailService, 'sendEmailGeo').mockImplementation(async () => {});
    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});
    jest
      .spyOn(blobService, 'uploadFile')
      .mockImplementation(async () => 'hashKeyFile');
    jest
      .spyOn(blobService, 'getFile')
      .mockImplementation(async () => Buffer.from('fake'));
    jest
      .spyOn(logPartnerRepository, 'create')
      .mockImplementation(async () => ({}) as any);
    jest
      .spyOn(logGeoRepository, 'create')
      .mockImplementation(async () => ({}) as any);

    await app.init();

    // Role com gerenciarTurmas + visualizarTurmas (para analytics)
    analyticsRole = await roleService.findOneBy({
      name: 'custom_role_analytics',
    });
    if (!analyticsRole) {
      const newRole = new CreateRoleDtoInput();
      newRole.name = 'custom_role_analytics';
      newRole.gerenciarTurmas = true;
      newRole.visualizarTurmas = true;
      analyticsRole = await roleService.create(newRole);
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply default mock implementations after clearAllMocks
    simuladoHttpMock.listUserGroupAggregates.mockResolvedValue([]);
    simuladoHttpMock.getUserGroupAggregateByMonth.mockResolvedValue(null);
    simuladoHttpMock.calculateUserGroupAggregate.mockResolvedValue({});
  });

  /**
   * Creates a partner + user with analyticsRole
   */
  const createPartnerWithAnalyticsRole = async () => {
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    user.role = analyticsRole;
    await userRepository.update(user);

    const dto: PartnerPrepCourseDtoInput = {
      geoId: geo.id,
      representative: user.id,
    };
    const partner = await partnerService.create(dto, user.id);
    return { user, partner };
  };

  /**
   * Creates a user without any special permissions (no role)
   */
  const createUnprivilegedUser = async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    return userRepository.findOneBy({ email: userDto.email });
  };

  /**
   * Creates a class with an ACTIVE course period (startDate <= today <= endDate)
   */
  const createClassWithActivePeriod = async (userId: string) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 9); // 9 months from now

    const coursePeriod = await coursePeriodService.create(
      {
        name: `Período Ativo ${Date.now()}`,
        startDate,
        endDate,
      },
      userId,
    );

    const classDto = {
      name: `Turma Analytics ${Date.now()}`,
      description: 'Turma de teste analytics',
      coursePeriodId: coursePeriod.id,
    };

    const createdClass = await request(app.getHttpServer())
      .post('/class')
      .send(classDto)
      .set({
        Authorization: `Bearer ${await jwtService.signAsync(
          { user: { id: userId } },
          { expiresIn: '2h' },
        )}`,
      })
      .expect(201);

    return { classId: createdClass.body.id as string, coursePeriod };
  };

  /**
   * Creates a class with an ENDED course period (endDate < today)
   */
  const createClassWithEndedPeriod = async (userId: string) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 2); // 2 years ago
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() - 1); // 1 month ago

    const coursePeriod = await coursePeriodService.create(
      {
        name: `Período Encerrado ${Date.now()}`,
        startDate,
        endDate,
      },
      userId,
    );

    const classDto = {
      name: `Turma Encerrada ${Date.now()}`,
      description: 'Turma de teste período encerrado',
      coursePeriodId: coursePeriod.id,
    };

    const createdClass = await request(app.getHttpServer())
      .post('/class')
      .send(classDto)
      .set({
        Authorization: `Bearer ${await jwtService.signAsync(
          { user: { id: userId } },
          { expiresIn: '2h' },
        )}`,
      })
      .expect(201);

    return { classId: createdClass.body.id as string, coursePeriod };
  };

  // ─── Cenário 1: 401 sem token / 403 sem permissão ─────────────────────────

  it('should return 403 when no bearer token is provided', async () => {
    return request(app.getHttpServer())
      .get('/class/some-class-id/analytics/simulado')
      .expect(403);
  });

  it('should return 403 when user lacks visualizarTurmas permission', async () => {
    const unprivileged = await createUnprivilegedUser();
    const token = await jwtService.signAsync(
      { user: { id: unprivileged.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .get('/class/some-class-id/analytics/simulado')
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  }, 30000);

  // ─── Cenário 2: 200 com lista vazia ───────────────────────────────────────

  it('should return 200 with empty months list when simulado returns []', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithActivePeriod(user.id);

    simuladoHttpMock.listUserGroupAggregates.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get(`/class/${classId}/analytics/simulado`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.months).toEqual([]);
    expect(response.body.coursePeriod).toBeDefined();
    expect(response.body.coursePeriod.isActive).toBe(true);
  }, 30000);

  // ─── Cenário 3: 404 mês não encontrado ────────────────────────────────────

  it('should return 404 when simulado returns null for the requested month', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithActivePeriod(user.id);

    simuladoHttpMock.getUserGroupAggregateByMonth.mockResolvedValue(null);

    return request(app.getHttpServer())
      .get(`/class/${classId}/analytics/simulado/2026-05`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404);
  }, 30000);

  // ─── Cenário 4: 202 refresh current (enfileiramento) ──────────────────────

  it('should return 202 and enqueue exactly one job for current month refresh', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithActivePeriod(user.id);

    const response = await request(app.getHttpServer())
      .post(`/class/${classId}/analytics/simulado/refresh`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(202);

    expect(response.body.enqueued).toHaveLength(1);
    expect(response.body.enqueued[0].classId).toBe(classId);
    expect(response.body.enqueued[0].month).toMatch(/^\d{4}-\d{2}$/);
    expect(response.body.estimatedSeconds).toBe(2);
  }, 30000);

  // ─── Cenário 5: 202 refresh all (enfileiramento múltiplo) ─────────────────

  it('should return 202 and enqueue N jobs for refresh?all=true', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Period starts 3 months ago → at least 3 months available
    const { classId } = await createClassWithActivePeriod(user.id);

    const response = await request(app.getHttpServer())
      .post(`/class/${classId}/analytics/simulado/refresh?all=true`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(202);

    const expectedMonths = response.body.enqueued.length;
    expect(expectedMonths).toBeGreaterThan(1);
    expect(response.body.estimatedSeconds).toBe(expectedMonths * 2);
    response.body.enqueued.forEach((entry: { classId: string; month: string }) => {
      expect(entry.classId).toBe(classId);
      expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
    });
  }, 30000);

  // ─── Cenário 6: 400 período encerrado ─────────────────────────────────────

  it('should return 400 when trying to refresh a class with an ended period', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithEndedPeriod(user.id);

    return request(app.getHttpServer())
      .post(`/class/${classId}/analytics/simulado/refresh`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);
  }, 30000);
});
