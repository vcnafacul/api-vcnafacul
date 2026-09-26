import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
  let jwtService: JwtService;

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
    jwtService = moduleFixture.get(JwtService);
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

  describe('cadastro pelo Google (card 02)', () => {
    const segundoPasso = () => ({
      firstName: 'Ana Maria',
      lastName: 'Souza',
      socialName: 'Aninha',
      phone: '(11) 99999-0000',
      gender: 2,
      birthday: '2000-05-10',
      state: 'SP',
      city: 'São Paulo',
      lgpd: true,
    });

    /** Volta do Google sem conta: devolve o cookie do cadastro pendente. */
    async function semConta(email = `nova-${Date.now()}@gmail.com`) {
      const perfil = perfilDe(email);
      const res = await voltarDoGoogle(perfil, await irAoGoogle()).expect(302);
      const cookie = [res.headers['set-cookie']]
        .flat()
        .find((c: string) => c.startsWith('google_cadastro='));
      return { perfil, res, cookie: cookie?.split(';')[0] };
    }

    it('sem conta: vai ao 2º passo e NÃO grava nada em users', async () => {
      const { perfil, res, cookie } = await semConta();
      expect(res.headers.location).toBe(`${FRONT}/cadastro/google`);
      expect(cookie).toBeDefined();
      expect(
        await userRepository.findOneBy({ email: perfil.email }),
      ).toBeNull();
    });

    it('GET cadastro devolve email e nome do Google', async () => {
      const { perfil, cookie } = await semConta();
      const res = await request(app.getHttpServer())
        .get('/user/auth/google/cadastro')
        .set('Cookie', cookie)
        .expect(200);
      expect(res.body).toEqual({
        email: perfil.email,
        firstName: 'Ana',
        lastName: 'Silva',
      });
    });

    it('2º passo: cria a conta confirmada, sem senha, vinculada, e sai logada', async () => {
      const { perfil, cookie } = await semConta();

      const res = await request(app.getHttpServer())
        .post('/user/auth/google/cadastro')
        .set('Cookie', cookie)
        .send({ ...segundoPasso(), email: 'outro@x.com' })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.voltar).toBe('/convite-colaborador?token=abc');
      const cookies = [res.headers['set-cookie']].flat();
      expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
      expect(cookies.some((c) => /^google_cadastro=;/.test(c))).toBe(true);

      // ⚠️ o email é o do Google — o do body é ignorado
      expect(
        await userRepository.findOneBy({ email: 'outro@x.com' }),
      ).toBeNull();
      const conta = await userRepository.findOneBy({ email: perfil.email });
      expect(conta).toMatchObject({
        googleId: perfil.googleId,
        emailConfirmSended: null,
        firstName: 'Ana Maria',
        socialName: 'Aninha',
        useSocialName: true,
        lgpd: true,
      });
      const [{ password }] = await dataSource.query(
        'SELECT password FROM users WHERE id = ?',
        [conta.id],
      );
      expect(password).toBeNull();

      // Da próxima vez, é login
      const login = await voltarDoGoogle(perfil, await irAoGoogle()).expect(
        302,
      );
      expect(login.headers.location).toMatch(`${FRONT}/auth/google?`);
    });

    it('sem o cookie: 401', async () => {
      await request(app.getHttpServer())
        .post('/user/auth/google/cadastro')
        .send(segundoPasso())
        .expect(401);
    });

    it('um access token de login no lugar do cookie: 401', async () => {
      const usuario = await contaComSenha();
      const login = await voltarDoGoogle(
        perfilDe(usuario.email),
        await irAoGoogle(),
      ).expect(302);
      const refresh = [login.headers['set-cookie']]
        .flat()
        .find((c: string) => c.startsWith('refresh_token='));
      const { body } = await request(app.getHttpServer())
        .post('/user/refresh')
        .set('Cookie', refresh.split(';')[0]);

      await request(app.getHttpServer())
        .get('/user/auth/google/cadastro')
        .set('Cookie', `google_cadastro=${body.access_token}`)
        .expect(401);
    });

    it('token com perfil mas sem o typ de cadastro: 401', async () => {
      const forjado = await jwtService.signAsync({
        perfil: perfilDe(`forjado-${Date.now()}@gmail.com`),
        voltar: '/',
      });
      await request(app.getHttpServer())
        .post('/user/auth/google/cadastro')
        .set('Cookie', `google_cadastro=${forjado}`)
        .send(segundoPasso())
        .expect(401);
    });

    it('o token de cadastro não vale como login', async () => {
      const { cookie } = await semConta();
      await request(app.getHttpServer())
        .get('/user/me')
        .set('Authorization', `Bearer ${cookie.split('=')[1]}`)
        .expect(401);
    });

    it.each([
      ['sem aceite da LGPD', { lgpd: false }],
      ['menor de 14 anos', { birthday: new Date().toISOString() }],
      ['sem telefone', { phone: '' }],
    ])('%s: recusa', async (_, campo) => {
      const { perfil, cookie } = await semConta();
      await request(app.getHttpServer())
        .post('/user/auth/google/cadastro')
        .set('Cookie', cookie)
        .send({ ...segundoPasso(), ...campo })
        .expect(400);
      expect(
        await userRepository.findOneBy({ email: perfil.email }),
      ).toBeNull();
    });

    it('o email ganhou conta no meio do caminho: 409', async () => {
      const dto = CreateUserDtoInputFaker();
      const { cookie } = await semConta(dto.email);
      await userService.create(dto);

      await request(app.getHttpServer())
        .post('/user/auth/google/cadastro')
        .set('Cookie', cookie)
        .send(segundoPasso())
        .expect(409);
    });
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
