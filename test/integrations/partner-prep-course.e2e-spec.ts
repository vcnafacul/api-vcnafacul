import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { AuditLogModule } from 'src/modules/audit-log/audit-log.module';
import { GeoService } from 'src/modules/geo/geo.service';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { CreateGeoDTOInputFaker } from 'test/faker/create-geo.dto.input.faker';
import { CreateUserDtoInputFaker } from 'test/faker/create.dto..input.faker';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

describe('PartnerPrepCourse (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let geoService: GeoService;
  let emailService: EmailService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, UserModule, RoleModule, AuditLogModule],
      providers: [UserService, UserRepository, EmailService, ConfigService],
    })
      .overrideGuard(JwtAuthGuard) // Aqui estamos substituindo o guard por um mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    geoService = moduleFixture.get<GeoService>(GeoService);
    emailService = moduleFixture.get<EmailService>(EmailService);

    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new PartnerPrepCourse', async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.createUser(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const dto: PartnerPrepCourseDtoInput = { geoId: geo.id, userId: user.id };

    return request(app.getHttpServer())
      .post('/partner-prep-course')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body.geoId).toEqual(geo.id);
        expect(res.body.userId).toEqual(user.id);
      });
  }, 10000);
});
