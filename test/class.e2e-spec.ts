import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { GeoService } from 'src/modules/geo/geo.service';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRoleRepository } from 'src/modules/user-role/user-role.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

describe('Class (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let geoService: GeoService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let userRoleRepository: UserRoleRepository;
  let partnerService: PartnerPrepCourseService;
  let emailService: EmailService;
  let role: Role = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService],
    }).compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    geoService = moduleFixture.get<GeoService>(GeoService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    userRoleRepository =
      moduleFixture.get<UserRoleRepository>(UserRoleRepository);
    emailService = moduleFixture.get<EmailService>(EmailService);
    partnerService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );

    jest
      .spyOn(emailService, 'sendCreateGeoMail')
      .mockImplementation(async () => {});

    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});

    await app.init();

    role = await roleService.findOneBy({ name: 'custom_role_class' });
    if (!role) {
      const newRole = new Role();
      newRole.name = 'custom_role_class';
      newRole.gerenciarTurmas = true;
      role = await roleService.create(newRole);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const createPartnerFaker = async () => {
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const userRole = await userRoleRepository.findOneBy({
      userId: user.id,
    });

    userRole.role = role;

    await userRoleRepository.update(userRole);

    const dto: PartnerPrepCourseDtoInput = { geoId: geo.id, userId: user.id };
    await partnerService.create(dto, user.id);
    return user;
  };

  it('should be create a class', async () => {
    const classDto = {
      name: 'test',
      description: 'test',
      year: 2022,
      startDate: new Date(),
      endDate: new Date(),
    };

    const user = await createPartnerFaker();

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return await request(app.getHttpServer())
      .post('/class')
      .expect(201)
      .send(classDto)
      .set({
        Authorization: `Bearer ${token}`,
      });
  }, 30000);

  it('should update a class successfully', async () => {
    const user = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Criando uma turma para testar a atualização
    const createdClass = await request(app.getHttpServer())
      .post('/class')
      .send({
        name: 'Initial Name',
        description: 'Initial Description',
        year: 2022,
        startDate: new Date(),
        endDate: new Date(),
      })
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    const updateDto = {
      _id: createdClass.body.id,
      name: 'Updated Name',
      description: 'Updated Description',
    };

    await request(app.getHttpServer())
      .patch('/class')
      .send(updateDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updatedClass = await request(app.getHttpServer())
      .get(`/class/${updateDto._id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(updatedClass.body.name).toBe(updateDto.name);
    expect(updatedClass.body.description).toBe(updateDto.description);
  });

  it('should return 404 if class does not exist', async () => {
    const user = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const updateDto = {
      _id: 'non-existing-class-id',
      name: 'Updated Name',
    };

    await request(app.getHttpServer())
      .patch('/class')
      .send(updateDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404);
  });

  it('should return 403 if user lacks permissions', async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const updateDto = { _id: 'existing-class-id', name: 'New Name' };

    await request(app.getHttpServer())
      .patch('/class')
      .send(updateDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  });
});
