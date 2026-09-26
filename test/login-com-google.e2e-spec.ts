import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as cookieParser from 'cookie-parser';
import { Strategy } from 'passport-google-oauth20';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { PerfilGoogle } from 'src/modules/user/google/google-auth.regras';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

/**
 * Entrar com Google (card 01 de `login-com-google`), com os guards de verdade
 * e só o Google simulado: a volta traz o perfil em JSON no `code`.
 */
jest.spyOn(Strategy.prototype, 'authenticate').mockImplementation(function (
  this: any,
  req: any,
  options: any,
) {
  if (req.query?.error) return this.fail({ message: req.query.error });
  if (req.query?.code) return this.success(JSON.parse(req.query.code));
  return this.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?state=${options.state}`,
  );
});

const FRONT = 'http://localhost:5173';

describe('Login com Google (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userService: UserService;
  let userRepository: UserRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    app.use(cookieParser());
    dataSource = moduleFixture.get(DataSource);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
    jest
      .spyOn(moduleFixture.get(EmailService), 'sendCreateUser')
      .mockImplementation(async () => {});

    await app.init();
    await moduleFixture.get(RoleSeedService).seed();
    await moduleFixture.get(RoleUpdateAdminSeedService).seed();
  });

  afterAll(async () => {
    if (app) await app.close();
  }, 30000);

  /** Ida ao Google: devolve o `state` e o cookie do nonce. */
  async function irAoGoogle(voltar = '/convite-colaborador?token=abc') {
    const res = await request(app.getHttpServer())
      .get('/user/auth/google')
      .query({ voltar })
      .expect(302);
    const state = new URL(res.headers.location).searchParams.get('state');
    const cookie = [res.headers['set-cookie']]
      .flat()
      .find((c: string) => c.startsWith('google_state='));
    return { state, cookie };
  }

  function voltarDoGoogle(
    perfil: PerfilGoogle,
    { state, cookie }: { state: string; cookie?: string },
  ) {
    const req = request(app.getHttpServer())
      .get('/user/auth/google/callback')
      .query({ state, code: JSON.stringify(perfil) });
    return cookie ? req.set('Cookie', cookie.split(';')[0]) : req;
  }

  async function contaComSenha() {
    const dto = CreateUserDtoInputFaker();
    await userService.create(dto);
    return userRepository.findOneBy({ email: dto.email });
  }

  const perfilDe = (email: string, googleId = `g-${Date.now()}`) => ({
    googleId,
    email: email.toLowerCase(),
    firstName: 'Ana',
    lastName: 'Silva',
  });

  it('a ida grava o nonce em cookie lax e leva o voltar no state', async () => {
    const { cookie } = await irAoGoogle();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('conta por email pendente: vincula, confirma, grava o refresh e volta sem token na URL', async () => {
    const usuario = await contaComSenha();
    expect(usuario.emailConfirmSended).not.toBeNull();
    const perfil = perfilDe(usuario.email);

    const res = await voltarDoGoogle(perfil, await irAoGoogle()).expect(302);

    expect(res.headers.location).toBe(
      `${FRONT}/auth/google?voltar=${encodeURIComponent('/convite-colaborador?token=abc')}`,
    );
    expect(res.headers.location).not.toMatch(/token=ey/);
    const refresh = [res.headers['set-cookie']]
      .flat()
      .find((c: string) => c.startsWith('refresh_token='));
    expect(refresh).toBeDefined();

    const depois = await userRepository.findOneBy({ id: usuario.id });
    expect(depois.googleId).toBe(perfil.googleId);
    expect(depois.emailConfirmSended).toBeNull();

    // O front troca o cookie por um access token
    const sessao = await request(app.getHttpServer())
      .post('/user/refresh')
      .set('Cookie', refresh.split(';')[0])
      .expect(200);
    expect(sessao.body.access_token).toBeDefined();
  });

  it('já vinculada: entra de novo pelo googleId', async () => {
    const usuario = await contaComSenha();
    const perfil = perfilDe(usuario.email);
    await voltarDoGoogle(perfil, await irAoGoogle()).expect(302);

    const res = await voltarDoGoogle(perfil, await irAoGoogle()).expect(302);
    expect(res.headers.location).toMatch(`${FRONT}/auth/google?`);
  });

  it('state sem o cookie do nonce: recusa e não vincula (CSRF de login)', async () => {
    const usuario = await contaComSenha();
    const { state } = await irAoGoogle();

    const res = await voltarDoGoogle(perfilDe(usuario.email), { state }).expect(
      302,
    );
    expect(res.headers.location).toBe(`${FRONT}/login?erro=google`);
    expect(
      (await userRepository.findOneBy({ id: usuario.id })).googleId,
    ).toBeNull();
  });

  it('state de outra ida (nonce trocado): recusa', async () => {
    const usuario = await contaComSenha();
    const { state } = await irAoGoogle();
    const { cookie } = await irAoGoogle();

    const res = await voltarDoGoogle(perfilDe(usuario.email), {
      state,
      cookie,
    }).expect(302);
    expect(res.headers.location).toBe(`${FRONT}/login?erro=google`);
  });

  it('desistiu na tela do Google: volta ao login com erro', async () => {
    const { state, cookie } = await irAoGoogle();
    const res = await request(app.getHttpServer())
      .get('/user/auth/google/callback')
      .query({ state, error: 'access_denied' })
      .set('Cookie', cookie.split(';')[0])
      .expect(302);
    expect(res.headers.location).toBe(`${FRONT}/login?erro=google`);
  });

  it('sem conta: volta ao login com sem-conta (o cadastro é o card 02)', async () => {
    const res = await voltarDoGoogle(
      perfilDe(`ninguem-${Date.now()}@gmail.com`),
      await irAoGoogle(),
    ).expect(302);
    expect(res.headers.location).toBe(`${FRONT}/login?erro=sem-conta`);
  });

  it('conta removida: recusa', async () => {
    const usuario = await contaComSenha();
    await dataSource.query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [
      usuario.id,
    ]);

    const res = await voltarDoGoogle(
      perfilDe(usuario.email),
      await irAoGoogle(),
    ).expect(302);
    expect(res.headers.location).toBe(`${FRONT}/login?erro=conta-removida`);
  });

  it('login por senha em conta sem senha: 401 com a mensagem do Google', async () => {
    const usuario = await contaComSenha();
    await dataSource.query('UPDATE users SET password = NULL WHERE id = ?', [
      usuario.id,
    ]);

    const res = await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: usuario.email, password: 'qualquer-coisa' })
      .expect(401);
    expect(res.body.message).toMatch(/Google/);
  });
});
