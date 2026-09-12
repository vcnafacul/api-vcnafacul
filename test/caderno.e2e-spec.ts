import { HttpException, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { CadernoHttpService } from 'src/modules/simulado/caderno/caderno-http.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { ControllerExceptionsFilter } from 'src/exceptions/controller.filter';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

const ID = '65ecc850a528b39d273e7900';

describe('Caderno (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let jwtService: JwtService;
  let roleService: RoleService;

  // O ms nao sobe no e2e: forjamos o service que fala com ele.
  const cadernoHttpMock = { baixar: jest.fn() };

  const discordWebhookMock = {
    sendMessage: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CadernoHttpService)
      .useValue(cadernoHttpMock)
      .overrideProvider(DiscordWebhook)
      .useValue(discordWebhookMock)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    // ⚠️ createNestAppTest NAO registra o ControllerExceptionsFilter (o
    // main.ts registra). E o filtro que monta o corpo de erro final em
    // producao -- e a mensagem legivel do 409 e o que este e2e prova.
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

  const tokenFor = async (userId: string) =>
    jwtService.signAsync({ user: { id: userId } }, { expiresIn: '2h' });

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

    tokenComPermissao = await tokenFor(userComPermissao.id);
    tokenSemPermissao = await tokenFor(userSemPermissao.id);
  });

  beforeEach(() => {
    cadernoHttpMock.baixar.mockReset();
  });

  it('200: devolve o zip com os headers', async () => {
    cadernoHttpMock.baixar.mockResolvedValue({
      buffer: Buffer.from('PKfake-zip'),
      contentType: 'application/zip',
      avisos: '3',
    });

    const r = await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}`)
      .set({ Authorization: `Bearer ${tokenComPermissao}` })
      // ⚠️ `application/zip` não tem parser embutido no superagent; sem um
      // parser explícito o corpo binário vira texto utf8 (com perda) em
      // `r.text` e `r.body` fica `{}`. Forçamos o parser de buffer bruto.
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(r.status).toBe(200);
    expect(r.headers['content-disposition']).toBe(
      `attachment; filename="caderno-${ID}.zip"`,
    );
    expect(r.headers['x-caderno-avisos']).toBe('3');
    expect(r.body).toEqual(Buffer.from('PKfake-zip'));
  });

  it('200: repassa o ?draft=true', async () => {
    cadernoHttpMock.baixar.mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
    });
    await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}?draft=true`)
      .set({ Authorization: `Bearer ${tokenComPermissao}` });
    expect(cadernoHttpMock.baixar).toHaveBeenCalledWith(ID, true);
  });

  it('401: sem JWT', async () => {
    // ⚠️ E por isto que o endpoint usa JwtAuthGuard junto: so com o
    // PermissionsGuard, o Nest traduziria a recusa para 403.
    const r = await request(app.getHttpServer()).get(
      `/mssimulado/caderno/${ID}`,
    );
    expect(r.status).toBe(401);
  });

  it('403: JWT valido, sem visualizarProvas', async () => {
    const r = await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}`)
      .set({ Authorization: `Bearer ${tokenSemPermissao}` });
    expect(r.status).toBe(403);
  });

  it('409: a mensagem do ms chega LEGIVEL', async () => {
    // O teste que justifica a Task 1. Antes dela, o corpo saia com 81 chaves
    // comecando em "0","1","2" e a mensagem virava
    // {"type":"Buffer","data":[...]}.
    cadernoHttpMock.baixar.mockRejectedValue(
      new HttpException(
        {
          message:
            'simulado nao esta pronto (questoes pendentes ou incompletas)',
        },
        409,
      ),
    );

    const r = await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}`)
      .set({ Authorization: `Bearer ${tokenComPermissao}` });

    expect(r.status).toBe(409);
    expect(r.body.message).toContain('nao esta pronto');
    // Nenhuma chave numerica: e a assinatura do Buffer espalhado.
    expect(Object.keys(r.body).filter((k) => /^\d+$/.test(k))).toEqual([]);
  });

  it('400: simuladoId que sairia do caminho, sem tocar no ms', async () => {
    // ⚠️ MEDIDO: o Express casa `..%2F..%2F` como UM segmento e entrega o
    // valor decodificado. Sem o pipe, a api chamaria
    // http://ms-simulado:3000/v1/simulado/outro.
    cadernoHttpMock.baixar.mockClear();
    const r = await request(app.getHttpServer())
      .get('/mssimulado/caderno/..%2F..%2Fv1%2Fsimulado%2Foutro')
      .set({ Authorization: `Bearer ${tokenComPermissao}` });

    expect(r.status).toBe(400);
    expect(cadernoHttpMock.baixar).not.toHaveBeenCalled();
  });
});
