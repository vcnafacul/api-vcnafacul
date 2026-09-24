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

  // ── Card 02: a busca dá match ─────────────────────────────────────────

  describe('busca (usuários 02)', () => {
    /** Marca única por execução — nenhum outro teste tem este sobrenome. */
    const marca = `Qz${Date.now().toString(36)}`;
    let tokenAdmin: string;

    const cadastrar = async (dados: Record<string, string>) => {
      const dto = { ...CreateUserDtoInputFaker(), ...dados };
      await userService.create(dto as any);
      return dto;
    };

    const buscar = (termo: string) =>
      request(app.getHttpServer())
        .get(`/user?page=1&limit=50&name=${encodeURIComponent(termo)}`)
        .set({ Authorization: `Bearer ${tokenAdmin}` })
        .expect(200)
        .then((r) => ({
          // A resposta é `{ user, roleId, roleName }`.
          emails: r.body.data.map((d: any) => d.user.email),
          total: r.body.totalItems,
        }));

    let maria: { email: string };
    let carla: { email: string };
    let joao: { email: string };

    beforeAll(async () => {
      tokenAdmin = (await usuario(true)).token;
      maria = await cadastrar({
        firstName: 'Maria',
        lastName: `da Silva ${marca}`,
        email: `maria.${marca.toLowerCase()}@x.com`,
      });
      carla = await cadastrar({
        firstName: 'Carlos',
        socialName: 'Carla',
        lastName: `Souza ${marca}`,
        email: `c.${marca.toLowerCase()}@x.com`,
      });
      joao = await cadastrar({
        firstName: 'João',
        lastName: `Pereira ${marca}`,
        email: `jp.${marca.toLowerCase()}@x.com`,
      });
    }, 60000);

    it('⚠️ nome + sobrenome dá match — antes não achava ninguém', async () => {
      expect((await buscar(`Maria ${marca}`)).emails).toEqual([maria.email]);
    });

    it('⚠️ pula o do meio: "Maria Silva" acha "Maria da Silva"', async () => {
      expect((await buscar(`Maria Silva ${marca}`)).emails).toEqual([
        maria.email,
      ]);
    });

    it('espaços extras não atrapalham', async () => {
      expect((await buscar(`  Maria   ${marca} `)).emails).toEqual([
        maria.email,
      ]);
    });

    it('email dá match', async () => {
      expect((await buscar(maria.email)).emails).toEqual([maria.email]);
    });

    it('⚠️ nome social dá match', async () => {
      expect((await buscar(`Carla ${marca}`)).emails).toEqual([carla.email]);
    });

    it('maiúscula não importa', async () => {
      expect((await buscar(`MARIA ${marca.toUpperCase()}`)).emails).toEqual([
        maria.email,
      ]);
    });

    it('acento não importa: "joao" acha "João"', async () => {
      // Depende da collation do servidor — medido no MySQL 8 e no MariaDB.
      expect((await buscar(`joao ${marca}`)).emails).toEqual([joao.email]);
    });

    it('⚠️ "%" é literal, não curinga — não devolve a base inteira', async () => {
      expect((await buscar('%')).total).toBe(0);
    });

    it('a contagem é a da mesma consulta', async () => {
      const r = await buscar(marca);
      expect(r.total).toBe(3);
      expect(r.emails).toHaveLength(3);
    });
  });
});
