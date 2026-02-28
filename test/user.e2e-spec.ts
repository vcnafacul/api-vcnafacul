import { faker } from '@faker-js/faker/locale/af_ZA';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { HasEmailDtoInput } from 'src/modules/user/dto/has-email.dto.input';
import { LoginDtoInput } from 'src/modules/user/dto/login.dto.input';
import { UserRepository } from 'src/modules/user/user.repository';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

describe('User e2e', () => {
  let app: INestApplication;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let userRepository: UserRepository;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideGuard(PermissionsGuard) // Here we are replacing the guard with a mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(EmailService)
      .useValue({
        sendCreateUser: jest.fn(),
      })
      .compile();

    app = createNestAppTest(moduleFixture);
    emailService = moduleFixture.get<EmailService>(EmailService);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should create a user', async () => {
    const newUser = CreateUserDtoInputFaker();
    await request(app.getHttpServer()).post('/user').send(newUser).expect(201);
    expect(emailService.sendCreateUser).toHaveBeenCalledTimes(1);
  }, 30000);

  it('should not create a user with the same email', async () => {
    const newUser = CreateUserDtoInputFaker();
    await request(app.getHttpServer()).post('/user').send(newUser).expect(201);
    await request(app.getHttpServer()).post('/user').send(newUser).expect(400); //409 is the status code for conflict
    expect(emailService.sendCreateUser).toHaveBeenCalledTimes(1);
  });

  it('should not create a user with different password and password_confirmation', async () => {
    const newUser = CreateUserDtoInputFaker();
    newUser.password_confirmation = faker.internet.password();
    await request(app.getHttpServer())
      .post('/user')
      .send(newUser)
      .expect(409)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 409,
          message: 'As senhas não coincidem',
        });
      });
    expect(emailService.sendCreateUser).toHaveBeenCalledTimes(0);
  });

  it('should confirm email', async () => {
    const newUser = CreateUserDtoInputFaker();
    await request(app.getHttpServer()).post('/user').send(newUser).expect(201);
    const user = await userRepository.findOneBy({ email: newUser.email });

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .patch(`/user/confirmemail`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
      });
  }, 30000);

  it('should throw an error if user not found', () => {
    const loginInput: LoginDtoInput = {
      email: 'notfound@example.com',
      password: 'password123',
    };
    return request(app.getHttpServer())
      .post('/user/login')
      .send(loginInput)
      .expect(404);
  }, 30000);

  it('should throw an error if password is invalid', async () => {
    const newUser = CreateUserDtoInputFaker();
    await request(app.getHttpServer()).post('/user').send(newUser).expect(201);

    const loginInput: LoginDtoInput = {
      email: newUser.email,
      password: 'wrongpassword',
    };
    await request(app.getHttpServer())
      .post('/user/login')
      .send(loginInput)
      .expect(409)
      .expect({ statusCode: 409, message: 'password invalid' });
  });

  it('should throw an error if email is not confirmed', async () => {
    const newUser = CreateUserDtoInputFaker();
    await request(app.getHttpServer()).post('/user').send(newUser).expect(201);

    const loginInput: LoginDtoInput = {
      email: newUser.email,
      password: newUser.password,
    };
    await request(app.getHttpServer())
      .post('/user/login')
      .send(loginInput)
      .expect(401)
      .expect({ statusCode: 401, message: 'waiting email validation' });
  });

  it('should throw an error if email confirmation sent less than 2 hours ago', async () => {
    const newUser = CreateUserDtoInputFaker();
    await request(app.getHttpServer()).post('/user').send(newUser).expect(201);

    const user = await userRepository.findOneBy({ email: newUser.email });
    user.emailConfirmSended = new Date(); // Simulate recent email sent
    await userRepository.create(user);

    const loginInput: LoginDtoInput = {
      email: newUser.email,
      password: newUser.password,
    };
    await request(app.getHttpServer())
      .post('/user/login')
      .send(loginInput)
      .expect(401)
      .expect({ statusCode: 401, message: 'waiting email validation' });
  });

  it('should return access token on successful login', async () => {
    const newUser = CreateUserDtoInputFaker();
    await request(app.getHttpServer()).post('/user').send(newUser).expect(201);

    const user = await userRepository.findOneBy({ email: newUser.email });
    user.emailConfirmSended = null; // Simulate email not sent
    await userRepository.create(user);

    const loginInput: LoginDtoInput = {
      email: newUser.email,
      password: newUser.password,
    };
    await request(app.getHttpServer())
      .post('/user/login')
      .send(loginInput)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
      });
  });

  it('should say that email not exist', async () => {
    const dto: HasEmailDtoInput = {
      email: faker.internet.email(),
    };
    await request(app.getHttpServer())
      .post('/user/hasemail')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body).toBe(false);
      });
  });

  it('should say that email exist', async () => {
    const newUser = CreateUserDtoInputFaker();
    await request(app.getHttpServer()).post('/user').send(newUser).expect(201);

    const dto: HasEmailDtoInput = {
      email: newUser.email,
    };
    await request(app.getHttpServer())
      .post('/user/hasemail')
      .send(dto)
      .expect(400);
  });
});
