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
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { PERMISSION_FIELD_MAP } from 'src/modules/role/permissions/permission-field-map';
import { Role } from 'src/modules/role/role.entity';
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
 * tickets/023, card 00: pelas rotas do cursinho, papel só recebe permissão de
 * projeto herdada de um perfil base da plataforma. Antes, o cursinho marcava
 * `criarQuestao`/`validarQuestao` e virava "admin" do banco de questões.
 */
describe('Papel de cursinho só recebe permissões de cursinho (e2e)', () => {
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

    await app.init();
    await moduleFixture.get(RoleSeedService).seed();
    await moduleFixture.get(RoleUpdateAdminSeedService).seed();
  });

  afterAll(async () => {
    if (app) await app.close();
  }, 30000);

  /** O corpo que a tela manda: todas as permissões, desligadas. */
  const papel = (extra: Record<string, unknown> = {}) => ({
    name: `papel ${Date.now()}-${Math.random()}`,
    base: false,
    ...Object.fromEntries(
      Object.values(PERMISSION_FIELD_MAP).map((c) => [c, false]),
    ),
    ...extra,
  });

  async function cursinho() {
    const dto = CreateUserDtoInputFaker();
    await userService.create(dto);
    const gestor = await userRepository.findOneBy({ email: dto.email });
    gestor.role = await roleService.findOneBy({ name: 'admin' });
    await userRepository.update(gestor);
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    await partnerPrepCourseService.create(
      { geoId: geo.id, representative: gestor.id },
      gestor.id,
    );
    const token = await jwtService.signAsync({ user: { id: gestor.id } });
    return { gestor, auth: `Bearer ${token}` };
  }

  const criar = (auth: string, body: object) =>
    request(app.getHttpServer())
      .post('/partner-prep-course/role')
      .set('Authorization', auth)
      .send(body);
  const editar = (auth: string, body: object) =>
    request(app.getHttpServer())
      .patch('/partner-prep-course/role')
      .set('Authorization', auth)
      .send(body);
  const doBanco = (id: string) =>
    dataSource.getRepository(Role).findOne({ where: { id } });

  /** Perfil base da plataforma que dá `visualizarQuestao`. */
  const perfilBase = () =>
    roleService.create(papel({ base: true, visualizarQuestao: true }) as any);

  it('⚠️ criarQuestao pela rota do cursinho → 400, e nada é criado', async () => {
    const { auth } = await cursinho();
    const body = papel({ criarQuestao: true });
    const res = await criar(auth, body).expect(400);
    expect(res.body.message).toContain('são da plataforma');
    expect(
      await dataSource.getRepository(Role).countBy({ name: body.name }),
    ).toBe(0);
  });

  it('só permissões de cursinho → 201, sem nenhuma de projeto', async () => {
    const { auth } = await cursinho();
    const res = await criar(
      auth,
      papel({ gerenciarTurmas: true, cadastrarProvasCursinho: true }),
    ).expect(201);
    const salvo = await doBanco(res.body.id);
    expect(salvo).toMatchObject({
      gerenciarTurmas: true,
      cadastrarProvasCursinho: true,
      criarQuestao: false,
      validarQuestao: false,
    });
  });

  it('herdada do perfil base passa; acima do base → 400', async () => {
    const { auth } = await cursinho();
    const base = await perfilBase();
    const ok = await criar(
      auth,
      papel({ roleBase: base.id, visualizarQuestao: true }),
    ).expect(201);
    expect((await doBanco(ok.body.id))!.visualizarQuestao).toBe(true);

    await criar(
      auth,
      papel({ roleBase: base.id, validarQuestao: true }),
    ).expect(400);
  });

  it('⚠️ perfil base que não é base da plataforma (ex.: o admin) → 400', async () => {
    const { auth } = await cursinho();
    const admin = await roleService.findOneBy({ name: 'admin' });
    await criar(auth, papel({ roleBase: admin.id })).expect(400);
  });

  it('editar: ligar validarQuestao → 400; mexer no que é do cursinho mantém o herdado', async () => {
    const { auth } = await cursinho();
    const base = await perfilBase();
    const { body: criado } = await criar(
      auth,
      papel({ roleBase: base.id }),
    ).expect(201);
    const atual = { ...(await doBanco(criado.id)) };

    await editar(auth, { ...atual, validarQuestao: true }).expect(400);

    await editar(auth, { ...atual, gerenciarTurmas: true }).expect(200);
    expect(await doBanco(criado.id)).toMatchObject({
      gerenciarTurmas: true,
      visualizarQuestao: true,
      validarQuestao: false,
    });
  });

  it('⚠️ papel antigo com permissão de projeto além do base: editar é recusado até a plataforma limpar', async () => {
    const { auth } = await cursinho();
    const { body: criado } = await criar(auth, papel()).expect(201);
    await dataSource
      .getRepository(Role)
      .update({ id: criado.id }, { criarQuestao: true });
    const atual = { ...(await doBanco(criado.id)) };

    const res = await editar(auth, { ...atual, gerenciarTurmas: true }).expect(
      400,
    );
    expect(res.body.message).toContain('são da plataforma');
    expect((await doBanco(criado.id))!.criarQuestao).toBe(true); // não apagou calado
  });

  it('023 · 01: o cursinho dá as permissões novas do banco de questões', async () => {
    const { auth } = await cursinho();
    const res = await criar(
      auth,
      papel({ editarQuestoesCursinho: true }),
    ).expect(201);
    expect(await doBanco(res.body.id)).toMatchObject({
      editarQuestoesCursinho: true,
      visualizarQuestoesCursinho: true, // implies
      criarQuestao: false,
    });
  });

  it('a rota da plataforma (dashRoles) continua dando qualquer permissão', async () => {
    const { auth } = await cursinho(); // o gestor tem o papel admin
    await request(app.getHttpServer())
      .post('/role')
      .set('Authorization', auth)
      .send(papel({ criarQuestao: true }))
      .expect(201);
  });
});
