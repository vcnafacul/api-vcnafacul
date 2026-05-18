import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from 'src/app.module';
import { Essay } from 'src/modules/essay/entities/essay.entity';
import { EssayReview } from 'src/modules/essay/entities/essay-review.entity';
import { EssayTheme } from 'src/modules/essay/entities/essay-theme.entity';
import { EssayInputType } from 'src/modules/essay/enums/essay-input-type.enum';
import { EssayStatus } from 'src/modules/essay/enums/essay-status.enum';
import { ReviewType } from 'src/modules/essay/enums/review-type.enum';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { ClassEssaySnapshot } from 'src/modules/prepCourse/class/essay-analytics/class-essay-snapshot.entity';
import { ClassRepository } from 'src/modules/prepCourse/class/class.repository';
import { CoursePeriodService } from 'src/modules/prepCourse/coursePeriod/course-period.service';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { StatusApplication } from 'src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { SubmissionService } from 'src/modules/vcnafacul-form/submission/submission.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

describe('ClassEssayAnalytics (e2e)', () => {
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
  let inscriptionCourseService: InscriptionCourseService;
  let studentCourseService: StudentCourseService;
  let studentCourseRepository: StudentCourseRepository;
  let submissionService: SubmissionService;
  let cacheService: CacheService;
  let essayRepo: Repository<Essay>;
  let essayReviewRepo: Repository<EssayReview>;
  let essayThemeRepo: Repository<EssayTheme>;
  let snapshotRepo: Repository<ClassEssaySnapshot>;

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
    inscriptionCourseService = moduleFixture.get<InscriptionCourseService>(
      InscriptionCourseService,
    );
    studentCourseService =
      moduleFixture.get<StudentCourseService>(StudentCourseService);
    studentCourseRepository = moduleFixture.get<StudentCourseRepository>(
      StudentCourseRepository,
    );
    submissionService = moduleFixture.get<SubmissionService>(SubmissionService);
    cacheService = moduleFixture.get<CacheService>(CacheService);
    essayRepo = moduleFixture.get<Repository<Essay>>(getRepositoryToken(Essay));
    essayReviewRepo = moduleFixture.get<Repository<EssayReview>>(
      getRepositoryToken(EssayReview),
    );
    essayThemeRepo = moduleFixture.get<Repository<EssayTheme>>(
      getRepositoryToken(EssayTheme),
    );
    snapshotRepo = moduleFixture.get<Repository<ClassEssaySnapshot>>(
      getRepositoryToken(ClassEssaySnapshot),
    );

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

    // Disable cache writes so classService.findOneById doesn't serve stale snapshots
    // when the test mutates students after the first read.
    jest.spyOn(cacheService, 'set').mockImplementation(async () => {});
    jest.spyOn(cacheService, 'get').mockImplementation(async () => undefined);

    // Avoid HTTP calls to vcnafacul-form when creating students
    jest
      .spyOn(submissionService, 'createSubmission')
      .mockImplementation(async () => 'hashKeyFile');

    await app.init();

    // Role with gerenciarTurmas + visualizarTurmas (for analytics endpoints)
    analyticsRole = await roleService.findOneBy({
      name: 'custom_role_essay_analytics',
    });
    if (!analyticsRole) {
      const newRole = new CreateRoleDtoInput();
      newRole.name = 'custom_role_essay_analytics';
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
    // Re-apply cache mocks (cleared by clearAllMocks)
    jest.spyOn(cacheService, 'set').mockImplementation(async () => {});
    jest.spyOn(cacheService, 'get').mockImplementation(async () => undefined);
    jest
      .spyOn(submissionService, 'createSubmission')
      .mockImplementation(async () => 'hashKeyFile');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────

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
        name: `Período Ativo Essay ${Date.now()}`,
        startDate,
        endDate,
      },
      userId,
    );

    const classDto = {
      name: `Turma Essay Analytics ${Date.now()}`,
      description: 'Turma de teste essay analytics',
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
        name: `Período Encerrado Essay ${Date.now()}`,
        startDate,
        endDate,
      },
      userId,
    );

    const classDto = {
      name: `Turma Essay Encerrada ${Date.now()}`,
      description: 'Turma de teste essay período encerrado',
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
   * Creates a student bound to the given inscription.
   * Returns both the StudentCourse id and the underlying user.id so seeded
   * essays can reference the right user FK without re-querying.
   */
  const createStudent = async (
    inscriptionId: string,
  ): Promise<{ id: string; userId: string }> => {
    const userStudentDto = CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });
    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionId,
    );
    const created = await studentCourseService.create(studentDto);
    return { id: created.id, userId: userStudent.id };
  };

  /**
   * Enrolls a freshly-created student into the given class (sets applicationStatus = Enrolled).
   * confirmEnrolled requires the student to be in DeclaredInterest first, so we bump it manually.
   */
  const enrollStudentInClass = async (studentId: string, classId: string) => {
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);
    await studentCourseService.confirmEnrolled(studentId, classId);
  };

  /**
   * Assigns a student to the given class but keeps their status as UnderReview (i.e. "Pending").
   * Used to test that the aggregation filters out non-Enrolled students.
   */
  const addPendingStudentToClass = async (
    studentId: string,
    classId: string,
  ) => {
    await studentCourseService.updateClass(studentId, classId);
    // updateClass does not modify applicationStatus; it stays UnderReview (default).
    const fresh = await studentCourseRepository.findOneBy({ id: studentId });
    expect(fresh.applicationStatus).toBe(StatusApplication.UnderReview);
  };

  /**
   * Creates an essay theme with default values. Each call uses a unique title.
   */
  const createTheme = async (creatorId: string, label = 'A') => {
    const theme = essayThemeRepo.create({
      title: `Tema ${label} ${Date.now()}-${Math.random()}`,
      motivationalText: 'Texto motivacional de teste',
      weekStart: new Date('2025-01-01'),
      weekEnd: new Date('2025-12-31'),
      active: true,
      createdBy: creatorId,
    });
    return await essayThemeRepo.save(theme);
  };

  /**
   * Creates a REVIEWED essay submitted "now" for the given (user, theme).
   */
  const createReviewedEssay = async (userId: string, themeId: string) => {
    const essay = essayRepo.create({
      userId,
      themeId,
      title: 'Título da redação',
      text: 'Texto da redação suficientemente longo para um teste...',
      inputType: EssayInputType.TYPED,
      status: EssayStatus.REVIEWED,
      wordCount: 250,
      submittedAt: new Date(),
    });
    return await essayRepo.save(essay);
  };

  /**
   * Creates an EssayReview for the given essay. Component scores are distributed
   * evenly so they sum (roughly) to totalScore.
   */
  const createReview = async (
    essayId: string,
    reviewType: ReviewType,
    totalScore: number,
  ) => {
    const each = Math.floor(totalScore / 5);
    const review = essayReviewRepo.create({
      essayId,
      reviewType,
      reviewerId: null,
      comp1Score: each,
      comp1Feedback: '',
      comp1Suggestion: '',
      comp2Score: each,
      comp2Feedback: '',
      comp2Suggestion: '',
      comp3Score: each,
      comp3Feedback: '',
      comp3Suggestion: '',
      comp4Score: each,
      comp4Feedback: '',
      comp4Suggestion: '',
      comp5Score: each,
      comp5Feedback: '',
      comp5Suggestion: '',
      totalScore,
      generalComment: '',
    });
    return await essayReviewRepo.save(review);
  };

  const currentMonth = () => new Date().toISOString().slice(0, 7);

  /**
   * Phase B: refresh enqueues; the in-memory worker processes the message on a
   * future tick. Poll the snapshot row until it appears (or fail after timeout).
   */
  const waitForSnapshot = async (
    classId: string,
    month: string,
    timeoutMs = 5000,
  ): Promise<ClassEssaySnapshot> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const snap = await snapshotRepo.findOne({ where: { classId, month } });
      if (snap) return snap;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(
      `Timed out waiting for snapshot ${classId}/${month} after ${timeoutMs}ms`,
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 1: 403 without token / 403 without visualizarTurmas
  // ────────────────────────────────────────────────────────────────────────────

  it('should return 403 when no bearer token is provided', async () => {
    return request(app.getHttpServer())
      .get('/class/some-class-id/analytics/redacao')
      .expect(403);
  });

  it('should return 403 when user lacks visualizarTurmas permission', async () => {
    const unprivileged = await createUnprivilegedUser();
    const token = await jwtService.signAsync(
      { user: { id: unprivileged.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .get('/class/some-class-id/analytics/redacao')
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  }, 30000);

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 2: 200 with empty months list when no snapshots exist
  // ────────────────────────────────────────────────────────────────────────────

  it('should return 200 with empty months list when no snapshots exist', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithActivePeriod(user.id);

    const response = await request(app.getHttpServer())
      .get(`/class/${classId}/analytics/redacao`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.months).toEqual([]);
    expect(response.body.coursePeriod).toBeDefined();
    expect(response.body.coursePeriod.isActive).toBe(true);
    expect(response.body.classId).toBe(classId);
  }, 30000);

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 3: 404 when the requested month has no snapshot
  // ────────────────────────────────────────────────────────────────────────────

  it('should return 404 when no snapshot exists for the requested month', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithActivePeriod(user.id);

    return request(app.getHttpServer())
      .get(`/class/${classId}/analytics/redacao/2026-05`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404);
  }, 30000);

  // ────────────────────────────────────────────────────────────────────────────
  // Scenarios 4 + 5: Seeded refresh produces correct aggregation
  //
  //  - 3 Enrolled students with essays this month:
  //      * student1: HUMAN review, totalScore=800
  //      * student2: HUMAN review, totalScore=600
  //      * student3: AI review only (no HUMAN review)
  //  - 1 Pending (UnderReview) student also in the same class with an essay +
  //    HUMAN review (totalScore=1000) — must be excluded.
  //
  //  Expected snapshot:
  //    geral                            = (800 + 600) / 2 = 700
  //    studentsWithAtLeastOneHumanReview= 2
  //    essaysReviewedByHuman            = 2
  //    essaysSubmittedTotal             = 3 (all 3 Enrolled, regardless of review type)
  //    humanReviewRate                  = 2 / 3
  // ────────────────────────────────────────────────────────────────────────────

  it('should aggregate only HUMAN-reviewed essays from Enrolled students of the class', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithActivePeriod(user.id);

    // Seed inscription + students
    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      user.id,
    );

    const s1 = await createStudent(inscription.id);
    const s2 = await createStudent(inscription.id);
    const s3 = await createStudent(inscription.id);
    const sPending = await createStudent(inscription.id);

    await enrollStudentInClass(s1.id, classId);
    await enrollStudentInClass(s2.id, classId);
    await enrollStudentInClass(s3.id, classId);
    await addPendingStudentToClass(sPending.id, classId);

    // Re-fetch userIds (some test envs create user inline; we trust dto.userId)
    const userId1 = s1.userId;
    const userId2 = s2.userId;
    const userId3 = s3.userId;
    const userIdPending = sPending.userId;

    // Create distinct themes (Essay has UNIQUE(userId, themeId) — different users
    // could share a theme, but to be safe we use a fresh theme per essay).
    const themeA = await createTheme(user.id, 'A');
    const themeB = await createTheme(user.id, 'B');
    const themeC = await createTheme(user.id, 'C');
    const themeD = await createTheme(user.id, 'D');

    // Enrolled student 1: HUMAN review, score 800
    const e1 = await createReviewedEssay(userId1, themeA.id);
    await createReview(e1.id, ReviewType.HUMAN, 800);

    // Enrolled student 2: HUMAN review, score 600
    const e2 = await createReviewedEssay(userId2, themeB.id);
    await createReview(e2.id, ReviewType.HUMAN, 600);

    // Enrolled student 3: AI review only (no HUMAN). Essay still counts in
    // essaysSubmittedTotal because status is REVIEWED.
    const e3 = await createReviewedEssay(userId3, themeC.id);
    await createReview(e3.id, ReviewType.AI, 700);

    // Pending student (UnderReview): essay + HUMAN review — must be excluded.
    const ePending = await createReviewedEssay(userIdPending, themeD.id);
    await createReview(ePending.id, ReviewType.HUMAN, 1000);

    // Trigger refresh (Phase B: enqueues; worker processes async)
    const refreshResp = await request(app.getHttpServer())
      .post(`/class/${classId}/analytics/redacao/refresh`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(202);

    expect(refreshResp.body.enqueued).toHaveLength(1);
    expect(refreshResp.body.enqueued[0].classId).toBe(classId);
    expect(refreshResp.body.enqueued[0].type).toBe('essay');
    const month = refreshResp.body.enqueued[0].month as string;
    expect(month).toMatch(/^\d{4}-\d{2}$/);
    expect(month).toBe(currentMonth());

    // Wait for the in-memory worker to materialize the snapshot
    await waitForSnapshot(classId, month);

    // Fetch the produced snapshot
    const getResp = await request(app.getHttpServer())
      .get(`/class/${classId}/analytics/redacao/${month}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(getResp.body.month).toBe(month);
    expect(getResp.body.geral).toBe(700);
    expect(getResp.body.studentsWithAtLeastOneHumanReview).toBe(2);
    expect(getResp.body.essaysReviewedByHuman).toBe(2);
    expect(getResp.body.essaysSubmittedTotal).toBe(3);
    expect(getResp.body.humanReviewRate).toBeCloseTo(2 / 3, 5);

    // Competencias: each comp gets totalScore/5 floor — verify they reflect the
    // same 2-user mean: ((800/5)+(600/5))/2 = (160+120)/2 = 140
    expect(getResp.body.competencias.c1).toBeCloseTo(140, 5);
    expect(getResp.body.competencias.c5).toBeCloseTo(140, 5);
  }, 60000);

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 6: Refresh is idempotent (upsert, no duplicate row)
  // ────────────────────────────────────────────────────────────────────────────

  it('should upsert the snapshot idempotently when refreshed twice', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithActivePeriod(user.id);

    // Minimal seed: one Enrolled student with a HUMAN-reviewed essay
    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      user.id,
    );
    const s1 = await createStudent(inscription.id);
    await enrollStudentInClass(s1.id, classId);

    const theme = await createTheme(user.id, 'idem');
    const e1 = await createReviewedEssay(s1.userId, theme.id);
    await createReview(e1.id, ReviewType.HUMAN, 500);

    const month = currentMonth();

    // First refresh — enqueues and worker writes the snapshot
    await request(app.getHttpServer())
      .post(`/class/${classId}/analytics/redacao/refresh`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(202);
    const first = await waitForSnapshot(classId, month);

    // Second refresh on the same month should upsert (not duplicate)
    await request(app.getHttpServer())
      .post(`/class/${classId}/analytics/redacao/refresh`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(202);

    // Wait until the worker re-runs (generatedAt advances)
    const startedAt = Date.now();
    while (Date.now() - startedAt < 5000) {
      const row = await snapshotRepo.findOne({ where: { classId, month } });
      if (row && row.generatedAt.getTime() > first.generatedAt.getTime()) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const rows = await snapshotRepo.find({ where: { classId, month } });
    expect(rows).toHaveLength(1);

    // listMonths should also return a single entry
    const listResp = await request(app.getHttpServer())
      .get(`/class/${classId}/analytics/redacao`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const monthEntries = (
      listResp.body.months as Array<{ month: string }>
    ).filter((m) => m.month === month);
    expect(monthEntries).toHaveLength(1);
  }, 60000);

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 7: 400 when the course period has ended
  // ────────────────────────────────────────────────────────────────────────────

  it('should return 400 when trying to refresh a class with an ended period', async () => {
    const { user } = await createPartnerWithAnalyticsRole();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const { classId } = await createClassWithEndedPeriod(user.id);

    return request(app.getHttpServer())
      .post(`/class/${classId}/analytics/redacao/refresh`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);
  }, 30000);

  // Suppress unused-variable warnings for fixtures we keep available for
  // potential follow-up assertions (e.g. classRepository for direct DB checks).
  void classRepository;
});
