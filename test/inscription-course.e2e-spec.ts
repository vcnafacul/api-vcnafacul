import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { CreateUserDtoInputFaker } from './faker/create.dto..input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

describe('InscriptionCourse (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let partnerPrepCourseService: PartnerPrepCourseService;
  let geoService: GeoService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideGuard(PermissionsGuard) // Here we are replacing the guard with a mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    emailService = moduleFixture.get<EmailService>(EmailService);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );

    partnerPrepCourseService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    geoService = moduleFixture.get<GeoService>(GeoService);

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

  it('should create a new inscription course', async () => {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    const partnerPrepCourse = await partnerPrepCourseService.create({
      geoId: geo.id,
      userId: representative.id,
    });

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker(
      partnerPrepCourse.id,
    );

    let idInscriptionCourse: number;
    await request(app.getHttpServer())
      .post('/inscription-course')
      .send(inscriptionCourseDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
        idInscriptionCourse = res.body.id;
      });

    const otherInscriptionCourseDto = CreateInscriptionCourseDTOInputFaker(
      partnerPrepCourse.id,
    );

    await request(app.getHttpServer())
      .post('/inscription-course')
      .send(otherInscriptionCourseDto)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toEqual(
          'already exists an active inscription course',
        );
      });

    await request(app.getHttpServer())
      .delete(`/inscription-course/${idInscriptionCourse}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/inscription-course')
      .send(otherInscriptionCourseDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
        idInscriptionCourse = res.body.id;
      });
  }, 60000);
});
