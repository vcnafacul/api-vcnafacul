import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create.dto..input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

describe('StudentCourse (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let emailService: EmailService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideGuard(JwtAuthGuard) // Here we are replacing the guard with a mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    emailService = moduleFixture.get<EmailService>(EmailService);

    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new StudentCourse', async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.createUser(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id);
    dto.rg = '45.678.123-4';

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('user not exist', async () => {
    const dto = createStudentCourseDTOInputFaker();

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(400)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('cpf invalid', async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.createUser(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id);
    dto.cpf = '12345678901';

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(400)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('uf invalid', async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.createUser(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id);
    dto.uf = 'XX';

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(400)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);
});
