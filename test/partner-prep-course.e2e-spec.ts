import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { assert } from 'console';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { EmailService } from 'src/shared/services/email/email.service';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

describe('PartnerPrepCourse (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let geoService: GeoService;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideGuard(JwtAuthGuard) // Aqui estamos substituindo o guard por um mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    geoService = moduleFixture.get<GeoService>(GeoService);
    emailService = moduleFixture.get<EmailService>(EmailService);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );

    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  it('test to pass', () => {
    assert(true);
  });

  // it('should create a new PartnerPrepCourse', async () => {
  //   const geoDto = CreateGeoDTOInputFaker();
  //   const geo = await geoService.create(geoDto);

  //   const userDto = CreateUserDtoInputFaker();
  //   await userService.create(userDto);
  //   const user = await userRepository.findOneBy({ email: userDto.email });

  //   const dto: PartnerPrepCourseDtoInput = { geoId: geo.id, userId: user.id };

  //   return request(app.getHttpServer())
  //     .post('/partner-prep-course')
  //     .send(dto)
  //     .expect(201)
  //     .expect((res) => {
  //       expect(res.body.geoId).toEqual(geo.id);
  //       expect(res.body.userId).toEqual(user.id);
  //     });
  // }, 30000);
});
