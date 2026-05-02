import { ExecutionContext, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { CompleteProfileDtoInput } from 'src/modules/user/dto/complete-profile.dto.input';
import { Gender } from 'src/modules/user/enum/gender';
import { GoogleAuthGuard } from 'src/modules/user/guards/google-auth.guard';
import { GoogleUser } from 'src/modules/user/strategy/google.strategy';
import { UserRepository } from 'src/modules/user/user.repository';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from 'src/modules/user/user.entity';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

const MOCK_GOOGLE_USER: GoogleUser = {
  googleId: 'google_test_id_123',
  email: 'googleuser@gmail.com',
  firstName: 'Google',
  lastName: 'User',
};

function mockGoogleGuard(googleUser: GoogleUser) {
  return {
    canActivate: jest.fn((context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = googleUser;
      return true;
    }),
  };
}

describe('Google OAuth e2e', () => {
  let app: INestApplication;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let userRepository: UserRepository;
  let jwtService: JwtService;
  let entityManager: EntityManager;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(GoogleAuthGuard)
      .useValue(mockGoogleGuard(MOCK_GOOGLE_USER))
      .overrideProvider(EmailService)
      .useValue({
        sendCreateUser: jest.fn(),
        sendForgotPasswordMail: jest.fn(),
      })
      .compile();

    app = createNestAppTest(moduleFixture);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    entityManager = moduleFixture.get<EntityManager>(getEntityManagerToken());

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();

    await entityManager.delete(User, { email: MOCK_GOOGLE_USER.email });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Google OAuth callback — novo usuário', () => {
    it('deve criar usuário parcial e redirecionar para /onboarding com token', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/auth/google/callback')
        .redirects(0)
        .expect(302);

      expect(res.headers.location).toContain('/onboarding?token=');
    }, 30000);

    it('usuário criado deve ter profileComplete=false e googleId preenchido', async () => {
      await request(app.getHttpServer())
        .get('/user/auth/google/callback')
        .redirects(0);

      const user = await userRepository.findOneBy({
        email: MOCK_GOOGLE_USER.email,
      });

      expect(user).toBeDefined();
      expect(user.googleId).toBe(MOCK_GOOGLE_USER.googleId);
      expect(user.profileComplete).toBe(false);
      expect(user.password).toBeNull();
      expect(user.emailConfirmSended).toBeNull();
    }, 30000);

    it('JWT no redirect deve conter profileComplete=false', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/auth/google/callback')
        .redirects(0);

      const location: string = res.headers.location;
      const token = location.split('token=')[1];
      const decoded = jwtService.decode(token) as Record<string, unknown>;

      expect(decoded.profileComplete).toBe(false);
    }, 30000);
  });

  describe('Google OAuth callback — usuário existente (auto-link)', () => {
    it('deve linkar googleId a conta existente e redirecionar para /auth/callback', async () => {
      const existingUser = CreateUserDtoInputFaker();
      existingUser.email = MOCK_GOOGLE_USER.email;
      await request(app.getHttpServer()).post('/user').send(existingUser);

      const user = await userRepository.findOneBy({
        email: MOCK_GOOGLE_USER.email,
      });
      user.emailConfirmSended = null;
      await userRepository.update(user);

      const res = await request(app.getHttpServer())
        .get('/user/auth/google/callback')
        .redirects(0)
        .expect(302);

      expect(res.headers.location).toContain('/auth/callback?token=');

      const updatedUser = await userRepository.findOneBy({
        email: MOCK_GOOGLE_USER.email,
      });
      expect(updatedUser.googleId).toBe(MOCK_GOOGLE_USER.googleId);
    }, 30000);

    it('deve confirmar email pendente ao linkar conta Google', async () => {
      const existingUser = CreateUserDtoInputFaker();
      existingUser.email = MOCK_GOOGLE_USER.email;
      await request(app.getHttpServer()).post('/user').send(existingUser);

      const userBefore = await userRepository.findOneBy({
        email: MOCK_GOOGLE_USER.email,
      });
      expect(userBefore.emailConfirmSended).not.toBeNull();

      await request(app.getHttpServer())
        .get('/user/auth/google/callback')
        .redirects(0);

      const userAfter = await userRepository.findOneBy({
        email: MOCK_GOOGLE_USER.email,
      });
      expect(userAfter.emailConfirmSended).toBeNull();
    }, 30000);
  });

  describe('POST /user/login — usuário Google sem senha', () => {
    it('deve retornar 401 com mensagem específica ao tentar login por senha', async () => {
      await request(app.getHttpServer())
        .get('/user/auth/google/callback')
        .redirects(0);

      await request(app.getHttpServer())
        .post('/user/login')
        .send({ email: MOCK_GOOGLE_USER.email, password: 'qualquercoisa' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe(
            'password not set, use Google login or reset password',
          );
        });
    }, 30000);
  });

  describe('PATCH /user/complete-profile', () => {
    let googleUserToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .get('/user/auth/google/callback')
        .redirects(0);

      const location: string = res.headers.location;
      googleUserToken = location.split('token=')[1];
    });

    it('deve completar perfil e retornar novo JWT com profileComplete=true', async () => {
      const dto: CompleteProfileDtoInput = {
        phone: '11999999999',
        gender: Gender.Other,
        birthday: new Date('2000-01-01'),
        state: 'SP',
        city: 'São Paulo',
        lgpd: true,
      };

      await request(app.getHttpServer())
        .patch('/user/complete-profile')
        .set({ Authorization: `Bearer ${googleUserToken}` })
        .send(dto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          const decoded = jwtService.decode(res.body.access_token) as Record<
            string,
            unknown
          >;
          expect(decoded.profileComplete).toBe(true);
        });
    }, 30000);

    it('deve persistir os dados no banco após completar perfil', async () => {
      const dto: CompleteProfileDtoInput = {
        phone: '11999999999',
        gender: Gender.Female,
        birthday: new Date('1995-06-15'),
        state: 'RJ',
        city: 'Rio de Janeiro',
        lgpd: true,
      };

      await request(app.getHttpServer())
        .patch('/user/complete-profile')
        .set({ Authorization: `Bearer ${googleUserToken}` })
        .send(dto);

      const user = await userRepository.findOneBy({
        email: MOCK_GOOGLE_USER.email,
      });

      expect(user.phone).toBe(dto.phone);
      expect(user.state).toBe(dto.state);
      expect(user.city).toBe(dto.city);
      expect(user.lgpd).toBe(true);
      expect(user.profileComplete).toBe(true);
    }, 30000);

    it('deve retornar 403 ao chamar complete-profile com usuário normal', async () => {
      const normalUser = CreateUserDtoInputFaker();
      await request(app.getHttpServer()).post('/user').send(normalUser);

      const user = await userRepository.findOneBy({ email: normalUser.email });
      user.emailConfirmSended = null;
      await userRepository.update(user);

      const loginRes = await request(app.getHttpServer())
        .post('/user/login')
        .send({ email: normalUser.email, password: normalUser.password });

      const normalToken = loginRes.body.access_token;

      const dto: CompleteProfileDtoInput = {
        phone: '11999999999',
        gender: Gender.Other,
        birthday: new Date('2000-01-01'),
        state: 'SP',
        city: 'São Paulo',
        lgpd: true,
      };

      await request(app.getHttpServer())
        .patch('/user/complete-profile')
        .set({ Authorization: `Bearer ${normalToken}` })
        .send(dto)
        .expect(403);
    }, 30000);

    it('deve retornar 400 com dados incompletos', async () => {
      await request(app.getHttpServer())
        .patch('/user/complete-profile')
        .set({ Authorization: `Bearer ${googleUserToken}` })
        .send({ phone: '11999999999' })
        .expect(400);
    }, 30000);
  });
});
