import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoRepository } from 'src/modules/geo/geo.repository';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { ConviteColaborador } from 'src/modules/prepCourse/conviteColaborador/convite-colaborador.entity';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

/**
 * Convite gravado (card 03 de `convite-de-colaborador`) contra o MySQL real.
 *
 * ⚠️ **O que só o banco prova:** a `chave_ativa` gerada + índice único é o que
 * impede dois convites pendentes para o mesmo email no mesmo cursinho quando
 * duas requisições passam juntas pela checagem do service — um duplo clique.
 */
describe('Convite de colaborador (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let userService: UserService;
  let userRepository: UserRepository;
  let roleService: RoleService;
  let geoService: GeoService;
  let partnerPrepCourseService: PartnerPrepCourseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideProvider(FormService)
      .useValue({ createPartnerForm: jest.fn(), hasActiveForm: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    dataSource = moduleFixture.get(DataSource);
    jwtService = moduleFixture.get(JwtService);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
    roleService = moduleFixture.get(RoleService);
    geoService = moduleFixture.get(GeoService);
    partnerPrepCourseService = moduleFixture.get(PartnerPrepCourseService);
    const geoRepository = moduleFixture.get(GeoRepository);

    jest
      .spyOn(geoService, 'create')
      .mockImplementation(async (dto) =>
        geoRepository.create(geoService['convertDtoToDomain'](dto)),
      );
    jest
      .spyOn(moduleFixture.get(LogGeoRepository), 'create')
      .mockImplementation(async () => ({}) as any);
    jest
      .spyOn(moduleFixture.get(LogPartnerRepository), 'create')
      .mockImplementation(async () => ({}) as any);
    const email = moduleFixture.get(EmailService);
    jest.spyOn(email, 'sendCreateUser').mockImplementation(async () => {});
    jest.spyOn(email, 'sendEmailGeo').mockImplementation(async () => {});
    jest
      .spyOn(email, 'sendConviteColaborador')
      .mockImplementation(async () => {});

    await app.init();
    await moduleFixture.get(RoleSeedService).seed();
    await moduleFixture.get(RoleUpdateAdminSeedService).seed();
  });

  afterAll(async () => {
    if (app) await app.close();
  }, 30000);

  /** Um cursinho com o admin dele (logado) e uma função do cursinho. */
  async function cursinhoComAdmin() {
    const dto = CreateUserDtoInputFaker();
    await userService.create(dto);
    const admin = await userRepository.findOneBy({ email: dto.email });
    admin.role = await roleService.findOneBy({ name: 'admin' });
    await userRepository.update(admin);

    const geo = await geoService.create(CreateGeoDTOInputFaker());
    await partnerPrepCourseService.create(
      { geoId: geo.id, representative: admin.id },
      admin.id,
    );
    const funcao = await partnerPrepCourseService.createRole(
      { name: `Professor ${Date.now()}`, base: false } as any,
      admin.id,
    );
    const token = await jwtService.signAsync({ user: { id: admin.id } });
    return { admin, funcao, token };
  }

  const convidar = (token: string, email: string, roleId: string) =>
    request(app.getHttpServer())
      .post('/convites-colaborador')
      .set({ Authorization: `Bearer ${token}` })
      .send({ email, roleId });

  const pendentes = (email: string) =>
    dataSource
      .getRepository(ConviteColaborador)
      .count({ where: { email, status: 'pendente' as any } });

  it('cria o convite pendente e lista', async () => {
    const { token, funcao } = await cursinhoComAdmin();
    const email = `nova.${Date.now()}@x.com`;

    await convidar(token, email, funcao.id).expect(201);

    const lista = await request(app.getHttpServer())
      .get('/convites-colaborador')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(lista.body[0]).toMatchObject({
      email,
      situacao: 'pendente',
      funcao: { id: funcao.id },
    });
  }, 30000);

  it('o segundo convite para o mesmo email é recusado com 409', async () => {
    const { token, funcao } = await cursinhoComAdmin();
    const email = `repetida.${Date.now()}@x.com`;

    await convidar(token, email, funcao.id).expect(201);
    const segundo = await convidar(token, email, funcao.id).expect(409);

    expect(segundo.body.message).toMatch(/Já existe um convite pendente/);
  }, 30000);

  it('⚠️ DUPLO CLIQUE: dois POSTs em paralelo → um convite só', async () => {
    const { token, funcao } = await cursinhoComAdmin();
    const email = `duplo.${Date.now()}@x.com`;

    const respostas = await Promise.all([
      convidar(token, email, funcao.id),
      convidar(token, email, funcao.id),
      convidar(token, email, funcao.id),
    ]);

    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(await pendentes(email)).toBe(1);
  }, 30000);

  it('⚠️ cancelado libera a chave — dá para convidar de novo', async () => {
    const { token, funcao } = await cursinhoComAdmin();
    const email = `cancelada.${Date.now()}@x.com`;

    const { body } = await convidar(token, email, funcao.id).expect(201);
    await request(app.getHttpServer())
      .delete(`/convites-colaborador/${body.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    await convidar(token, email, funcao.id).expect(201);
  }, 30000);

  it('⚠️ o vencido é substituído: vira expirado e o novo entra', async () => {
    const { token, funcao } = await cursinhoComAdmin();
    const email = `vencida.${Date.now()}@x.com`;

    const { body } = await convidar(token, email, funcao.id).expect(201);
    await dataSource
      .getRepository(ConviteColaborador)
      .update({ id: body.id }, { expiraEm: new Date(Date.now() - 1000) });

    await convidar(token, email, funcao.id).expect(201);

    const antigo = await dataSource
      .getRepository(ConviteColaborador)
      .findOneBy({ id: body.id });
    expect(antigo?.status).toBe('expirado');
    expect(await pendentes(email)).toBe(1);
  }, 30000);

  it('⚠️ convite de OUTRO cursinho responde 404 — não confirma que existe', async () => {
    const a = await cursinhoComAdmin();
    const b = await cursinhoComAdmin();
    const { body } = await convidar(
      a.token,
      `de-a.${Date.now()}@x.com`,
      a.funcao.id,
    );

    await request(app.getHttpServer())
      .delete(`/convites-colaborador/${body.id}`)
      .set({ Authorization: `Bearer ${b.token}` })
      .expect(404);
  }, 30000);

  it('⚠️ sem gerenciarPermissoesCursinho: 403 — o guard está em cada rota', async () => {
    /*
      Com o guard na CLASSE, o PermissionsGuard não achava a permissão (lê só
      do handler) e liberava tudo. Este teste é o que garante que não voltou.
    */
    const dto = CreateUserDtoInputFaker();
    await userService.create(dto);
    const aluno = await userRepository.findOneBy({ email: dto.email });
    const token = await jwtService.signAsync({ user: { id: aluno.id } });

    await convidar(token, `x.${Date.now()}@x.com`, 'qualquer').expect(403);
    await request(app.getHttpServer())
      .get('/convites-colaborador')
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  }, 30000);
});
