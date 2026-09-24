import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/webhooks/discord.ts');

/**
 * Listar e ler usuários exige `alterarPermissao` (card 01 de
 * `tela-de-usuarios`).
 *
 * ⚠️ **Com o `PermissionsGuard` REAL** — o `user.e2e` o substitui por um que
 * libera tudo, e por isso não pegaria esta regra. Antes, com só login,
 * qualquer aluno listava a base inteira com email e telefone.
 */
describe('GET /user e GET /user/:id — permissão (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userService: UserService;
  let userRepository: UserRepository;
  let roleService: RoleService;

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
    jwtService = moduleFixture.get(JwtService);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
    roleService = moduleFixture.get(RoleService);
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

  async function usuario(comoAdmin: boolean) {
    const dto = CreateUserDtoInputFaker();
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    if (comoAdmin) {
      u.role = await roleService.findOneBy({ name: 'admin' });
      await userRepository.update(u);
    }
    const token = await jwtService.signAsync({ user: { id: u.id } });
    return { u, token };
  }

  it('⚠️ aluno NÃO lista a base — 403', async () => {
    const { token } = await usuario(false);

    await request(app.getHttpServer())
      .get('/user?page=1&limit=10')
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  }, 30000);

  it('⚠️ aluno NÃO lê o cadastro de outro pelo id — 403', async () => {
    const { token } = await usuario(false);
    const { u: outro } = await usuario(false);

    await request(app.getHttpServer())
      .get(`/user/${outro.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  }, 30000);

  it('o admin (alterarPermissao) lista e lê', async () => {
    const { token } = await usuario(true);
    const { u: outro } = await usuario(false);

    await request(app.getHttpServer())
      .get('/user?page=1&limit=10')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/user/${outro.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
  }, 30000);

  it('/user/me continua só com login', async () => {
    // Não confundir com o :id — o `me` é do próprio usuário.
    const { token } = await usuario(false);

    await request(app.getHttpServer())
      .get('/user/me')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
  }, 30000);
});
