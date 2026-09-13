import { INestApplication, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { ControllerExceptionsFilter } from 'src/exceptions/controller.filter';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

const BASE_MS = 'http://ms-forjado';

describe('Prova — paginacao no gateway (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let jwtService: JwtService;
  let roleService: RoleService;

  // ⚠️ Forjamos o axios por dentro da `HttpServiceAxios` real (mesmo molde do
  // caderno.e2e-spec): mockar o `ProvaService` tiraria do caminho justamente
  // a montagem da URL que este conserto faz. Assim, o que assertamos e a URL
  // que a api REALMENTE emitiria para o ms.
  const axiosForjado = { get: jest.fn() };
  const servicoReal = new HttpServiceAxios(BASE_MS, new Logger());
  (servicoReal as any).axiosInstance = axiosForjado;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpServiceAxiosFactory)
      .useValue({ create: () => servicoReal })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    app.useGlobalFilters(new ControllerExceptionsFilter());

    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const roleDto = (overrides: Partial<CreateRoleDtoInput> = {}) =>
    ({
      name: `Test Role ${Math.random()}`,
      base: false,
      validarCursinho: false,
      alterarPermissao: false,
      visualizarQuestao: false,
      criarQuestao: false,
      validarQuestao: false,
      uploadNews: false,
      visualizarProvas: false,
      cadastrarProvas: false,
      visualizarDemanda: false,
      uploadDemanda: false,
      validarDemanda: false,
      gerenciadorDemanda: false,
      gerenciarProcessoSeletivo: false,
      gerenciarColaboradores: false,
      gerenciarTurmas: false,
      gerenciarEstudantes: false,
      gerenciarPermissoesCursinho: false,
      visualizarTurmas: false,
      visualizarEstudantes: false,
      visualizarMinhasInscricoes: false,
      gerenciarFormularioGlobal: false,
      gerenciarFormulario: false,
      gerenciarTemas: false,
      revisarRedacoes: false,
      revisarTodasRedacoes: false,
      supportAgent: false,
      partnerPrepSupportAgent: false,
      editarMateriasFrentes: false,
      ...overrides,
    }) as CreateRoleDtoInput;

  const createUserWithRole = async (role: Role) => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });
    user.role = role;
    await userRepository.update(user);
    return user;
  };

  let tokenComPermissao: string;
  let tokenSemPermissao: string;

  beforeAll(async () => {
    const roleComPermissao = await roleService.create(
      roleDto({ visualizarProvas: true }),
    );
    const roleSemPermissao = await roleService.create(
      roleDto({ visualizarProvas: false }),
    );

    const userComPermissao = await createUserWithRole(roleComPermissao);
    const userSemPermissao = await createUserWithRole(roleSemPermissao);

    tokenComPermissao = await jwtService.signAsync(
      { user: { id: userComPermissao.id } },
      { expiresIn: '2h' },
    );
    tokenSemPermissao = await jwtService.signAsync(
      { user: { id: userSemPermissao.id } },
      { expiresIn: '2h' },
    );
  });

  beforeEach(() => {
    axiosForjado.get.mockReset();
    axiosForjado.get.mockResolvedValue({
      data: { data: [], page: 2, limit: 10, total: 0 },
    });
  });

  const listarProvas = (querystring = '') =>
    request(app.getHttpServer())
      .get(`/mssimulado/prova${querystring}`)
      .set({ Authorization: `Bearer ${tokenComPermissao}` });

  it('?page=2&limit=10 chega ao ms como v1/prova?page=2&limit=10', async () => {
    // O bug: o gateway jogava o querystring fora e o cliente recebia SEMPRE
    // as mesmas 40 primeiras provas -- a lista aparecia duplicada no scroll
    // infinito e o contador de total mentia junto.
    const r = await listarProvas('?page=2&limit=10');

    expect(r.status).toBe(200);
    // ⚠️ `toBe`, nao `toContain`: e a URL completa que sai para o ms.
    expect(axiosForjado.get).toHaveBeenCalledTimes(1);
    expect(axiosForjado.get.mock.calls[0][0]).toBe(
      `${BASE_MS}/v1/prova?page=2&limit=10`,
    );
  });

  it('sem querystring chega ao ms como v1/prova CRU', async () => {
    // ⚠️ O outro lado do conserto, e o mais facil de quebrar em silencio:
    // repassar `page=undefined` viraria a STRING "undefined" na URL. O ms nao
    // reclamaria -- so devolveria pagina errada. Por isso a assercao e
    // exata (`toBe`), e nao um `toContain('v1/prova')`, que passaria com
    // qualquer lixo grudado no fim.
    const r = await listarProvas();

    expect(r.status).toBe(200);
    expect(axiosForjado.get).toHaveBeenCalledTimes(1);
    expect(axiosForjado.get.mock.calls[0][0]).toBe(`${BASE_MS}/v1/prova`);
  });

  it('so ?page=3 → so o page vai junto', async () => {
    await listarProvas('?page=3');
    expect(axiosForjado.get.mock.calls[0][0]).toBe(
      `${BASE_MS}/v1/prova?page=3`,
    );
  });

  it('403: JWT valido, sem visualizarProvas — e nada sai para o ms', async () => {
    const r = await request(app.getHttpServer())
      .get('/mssimulado/prova?page=2&limit=10')
      .set({ Authorization: `Bearer ${tokenSemPermissao}` });

    expect(r.status).toBe(403);
    expect(axiosForjado.get).not.toHaveBeenCalled();
  });
});
