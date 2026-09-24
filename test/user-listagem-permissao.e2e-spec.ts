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
import { DataSource } from 'typeorm';
import { GeoRepository } from 'src/modules/geo/geo.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { StatusApplication } from 'src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';

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
  let dataSource: DataSource;

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
    dataSource = moduleFixture.get(DataSource);
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

  // ── Card 04: o resumo do usuário ──────────────────────────────────────

  describe('resumo (usuários 04)', () => {
    const resumo = (token: string, id: string) =>
      request(app.getHttpServer())
        .get(`/user/${id}/resumo`)
        .set({ Authorization: `Bearer ${token}` });

    /** Um cursinho de verdade (geo + parceiro), para os vínculos apontarem. */
    async function umCursinho() {
      const dono = (await usuario(false)).u;
      const geo = await app.get(GeoRepository).create({
        ...CreateGeoDTOInputFaker(),
        status: 1,
      } as any);
      await app
        .get(PartnerPrepCourseService)
        .create({ geoId: geo.id, representative: dono.id } as any, dono.id);
      const cursinho = await app
        .get(PartnerPrepCourseService)
        .getByUserId(dono.id);
      return { cursinho, nome: geo.name };
    }

    it('⚠️ só com alterarPermissao — aluno 403', async () => {
      const { token } = await usuario(false);
      const { u: outro } = await usuario(false);

      await resumo(token, outro.id).expect(403);
    }, 30000);

    it('⚠️ a rota não é engolida pelo GET :id', async () => {
      const { token } = await usuario(true);
      const { u: outro } = await usuario(false);

      const { body } = await resumo(token, outro.id).expect(200);

      expect(body).toHaveProperty('conta');
      expect(body).toHaveProperty('estudante');
    }, 30000);

    it('só aluno: sem colaborador, sem inscrição, email ainda não confirmado', async () => {
      const { token } = await usuario(true);
      const { u: aluno } = await usuario(false);

      const { body } = await resumo(token, aluno.id).expect(200);

      expect(body.conta).toMatchObject({
        id: aluno.id,
        email: aluno.email,
        emailConfirmado: false,
        desativada: false,
        funcao: { nome: 'aluno' },
      });
      expect(body.colaborador).toBeNull();
      expect(body.estudante).toEqual({ atual: [], historico: [] });
    }, 30000);

    it('colaborador: o cursinho, ativo e desde quando', async () => {
      const { token } = await usuario(true);
      const { u: pessoa } = await usuario(false);
      const { cursinho, nome } = await umCursinho();
      await dataSource.getRepository('Collaborator').save({
        user: { id: pessoa.id },
        partnerPrepCourse: { id: cursinho.id },
        description: '',
      });

      const { body } = await resumo(token, pessoa.id).expect(200);

      expect(body.colaborador).toMatchObject({
        cursinho: { id: cursinho.id, nome },
        ativo: true,
      });
    }, 30000);

    it('⚠️ estudante: Matriculado é o atual, o resto é histórico', async () => {
      const { token } = await usuario(true);
      const { u: pessoa } = await usuario(false);
      const { cursinho, nome } = await umCursinho();
      const repo = dataSource.getRepository('StudentCourse');
      for (const applicationStatus of [
        StatusApplication.Enrolled,
        StatusApplication.EnrollmentClosed,
        StatusApplication.UnderReview,
      ]) {
        await repo.save({
          userId: pessoa.id,
          user: { id: pessoa.id },
          cpf: '00000000000',
          email: pessoa.email,
          partnerPrepCourse: { id: cursinho.id },
          applicationStatus,
        });
      }

      const { body } = await resumo(token, pessoa.id).expect(200);

      expect(body.estudante.atual).toHaveLength(1);
      expect(body.estudante.atual[0]).toMatchObject({
        cursinho: { id: cursinho.id, nome },
        status: StatusApplication.Enrolled,
      });
      expect(body.estudante.historico.map((i: any) => i.status).sort()).toEqual(
        [
          StatusApplication.EnrollmentClosed,
          StatusApplication.UnderReview,
        ].sort(),
      );
    }, 30000);

    it('usuário que não existe: 404', async () => {
      const { token } = await usuario(true);

      await resumo(token, '00000000-0000-0000-0000-000000000000').expect(404);
    }, 30000);
  });
});
