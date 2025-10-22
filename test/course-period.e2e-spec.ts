import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { GeoService } from 'src/modules/geo/geo.service';
import { CoursePeriodRepository } from 'src/modules/prepCourse/coursePeriod/course-period.repository';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import CreateClassDtoInputFaker from './faker/create-class.dto.input.faker';
import { CreateCoursePeriodDtoInputFaker } from './faker/create-course-period.dto.input.faker';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

describe('CoursePeriod (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let emailService: EmailService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let partnerService: PartnerPrepCourseService;
  let coursePeriodRepository: CoursePeriodRepository;
  let geoService: GeoService;
  let role: Role = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService],
    }).compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    emailService = moduleFixture.get<EmailService>(EmailService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    partnerService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    coursePeriodRepository = moduleFixture.get<CoursePeriodRepository>(
      CoursePeriodRepository,
    );
    geoService = moduleFixture.get<GeoService>(GeoService);

    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});

    // Criar role para testes
    const roleDto: CreateRoleDtoInput = {
      name: 'Test Role',
      base: false,
      validarCursinho: false,
      alterarPermissao: false,
      criarSimulado: false,
      visualizarQuestao: false,
      criarQuestao: false,
      validarQuestao: false,
      uploadNews: false,
      visualizarProvas: false,
      cadastrarProvas: false,
      visualizarDemanda: false,
      uploadDemanda: false,
      validarDemanda: false,
      gerenciadorDemanda: false,
      gerenciarProcessoSeletivo: false,
      gerenciarColaboradores: false,
      gerenciarTurmas: true, // ✅ Permissão para gerenciar turmas
      gerenciarEstudantes: false,
      gerenciarPermissoesCursinho: false,
      visualizarTurmas: false,
      visualizarEstudantes: false,
    };
    role = await roleService.create(roleDto);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const createPartnerFaker = async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    // Assign role to user
    user.role = role;
    await userRepository.update(user);

    // Create geo location
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const partnerDto: PartnerPrepCourseDtoInput = {
      geoId: geo.id,
      representative: user.id,
    };

    const partner = await partnerService.create(partnerDto, user.id);
    return { user, partner };
  };

  it('should create a course period successfully', async () => {
    const { user } = await createPartnerFaker();
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const response = await request(app.getHttpServer())
      .post('/course-period')
      .expect(201)
      .send(coursePeriodDto)
      .set({
        Authorization: `Bearer ${token}`,
      });

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(coursePeriodDto.name);
    expect(response.body.year).toBe(
      new Date(coursePeriodDto.startDate).getFullYear(),
    );
    expect(response.body.startDate).toBe(
      coursePeriodDto.startDate.toISOString(),
    );
    expect(response.body.endDate).toBe(coursePeriodDto.endDate.toISOString());
    expect(response.body).toHaveProperty('partnerPrepCourseId');
  }, 30000);

  it('should fail to create course period with invalid dates', async () => {
    const { user } = await createPartnerFaker();
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();

    // Invalid: start date after end date
    coursePeriodDto.startDate = new Date('2024-12-31');
    coursePeriodDto.endDate = new Date('2024-01-01');

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .post('/course-period')
      .expect(400)
      .send(coursePeriodDto)
      .set({
        Authorization: `Bearer ${token}`,
      });
  }, 30000);

  it('should update a course period successfully', async () => {
    const { user } = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Create course period
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();
    const createdPeriod = await request(app.getHttpServer())
      .post('/course-period')
      .send(coursePeriodDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    // Update course period
    const updateDto = {
      id: createdPeriod.body.id,
      name: 'Updated Period Name',
      description: 'Updated Description',
    };

    await request(app.getHttpServer())
      .patch('/course-period')
      .send(updateDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    // Verify update
    const updatedPeriod = await request(app.getHttpServer())
      .get(`/course-period/${createdPeriod.body.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(updatedPeriod.body.name).toBe(updateDto.name);
  }, 30000);

  it('should get course period by id', async () => {
    const { user } = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Create course period
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();
    const createdPeriod = await request(app.getHttpServer())
      .post('/course-period')
      .send(coursePeriodDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    // Get by id
    const response = await request(app.getHttpServer())
      .get(`/course-period/${createdPeriod.body.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.id).toBe(createdPeriod.body.id);
    expect(response.body.name).toBe(coursePeriodDto.name);
    expect(response.body.year).toBe(
      new Date(coursePeriodDto.startDate).getFullYear(),
    );
  }, 30000);

  it('should delete course period successfully', async () => {
    const { user } = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Create course period
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();
    const createdPeriod = await request(app.getHttpServer())
      .post('/course-period')
      .send(coursePeriodDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    const periodId = createdPeriod.body.id;

    // Delete course period
    await request(app.getHttpServer())
      .delete(`/course-period/${periodId}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    // Verify deletion (soft delete)
    const deletedPeriod = await coursePeriodRepository.findOneById(periodId);
    expect(deletedPeriod).toBeNull(); // Should be null because of soft delete filter
  }, 30000);

  it('should fail to delete course period with classes', async () => {
    const { user } = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Create course period
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();
    const createdPeriod = await request(app.getHttpServer())
      .post('/course-period')
      .send(coursePeriodDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    const periodId = createdPeriod.body.id;

    // Create a real class for this period
    const classDto = CreateClassDtoInputFaker('Test Class');
    classDto.coursePeriodId = periodId;

    await request(app.getHttpServer())
      .post('/class')
      .send(classDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    // Try to delete course period (should fail because it has classes)
    await request(app.getHttpServer())
      .delete(`/course-period/${periodId}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);
  }, 30000);

  it('should fail to access course period from different partner', async () => {
    const { user: user1 } = await createPartnerFaker();
    const { user: user2 } = await createPartnerFaker();

    const token1 = await jwtService.signAsync(
      { user: { id: user1.id } },
      { expiresIn: '2h' },
    );

    const token2 = await jwtService.signAsync(
      { user: { id: user2.id } },
      { expiresIn: '2h' },
    );

    // Create course period with user1
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();
    const createdPeriod = await request(app.getHttpServer())
      .post('/course-period')
      .send(coursePeriodDto)
      .set({ Authorization: `Bearer ${token1}` })
      .expect(201);

    // Try to access with user2
    await request(app.getHttpServer())
      .get(`/course-period/${createdPeriod.body.id}`)
      .set({ Authorization: `Bearer ${token2}` })
      .expect(404);
  }, 30000);

  it('should validate required fields', async () => {
    const { user } = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Test missing name
    await request(app.getHttpServer())
      .post('/course-period')
      .send({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      })
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);

    // Test missing startDate
    await request(app.getHttpServer())
      .post('/course-period')
      .send({
        name: 'Test Period',
        endDate: new Date('2024-12-31'),
      })
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);

    // Test missing endDate
    await request(app.getHttpServer())
      .post('/course-period')
      .send({
        name: 'Test Period',
        startDate: new Date('2024-01-01'),
      })
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);
  }, 30000);
});
