import { INestApplication, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { ControllerExceptionsFilter } from 'src/exceptions/controller.filter';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
// ⚠️ Sem isto, `userService.create` quebra tentando renderizar o template
// React de confirmação de e-mail (mesmo ajuste do course-period.e2e-spec).
jest.mock('src/shared/services/email/email.service');

const ID = '65ecc850a528b39d273e7900';

describe('Caderno (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let jwtService: JwtService;
  let roleService: RoleService;

  // ⚠️ Forjamos o axios, não o `CadernoHttpService`: mockar o service
  // tiraria a `HttpServiceAxiosFactory` inteira do caminho, e é justamente
  // a composição `handleError` (desembrulharCorpo) → `ControllerExceptionsFilter`
  // que este card conserta. Trocando só a instância do axios por dentro da
  // `HttpServiceAxios` real, o resto da corrente roda com código de produção.
  const axiosForjado = { get: jest.fn() };
  const servicoReal = new HttpServiceAxios('http://ms-forjado', new Logger());
  (servicoReal as any).axiosInstance = axiosForjado;

  const discordWebhookMock = {
    sendMessage: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpServiceAxiosFactory)
      .useValue({ create: () => servicoReal })
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
    axiosForjado.get.mockReset();
  });

  it('200: devolve o zip com os headers', async () => {
    axiosForjado.get.mockResolvedValue({
      data: Buffer.from('PKfake-zip'),
      headers: { 'content-type': 'application/zip', 'X-Caderno-Avisos': '3' },
    });
    // ⚠️ `X-Caderno-Avisos` em maiúsculas de propósito: é a forma como um
    // servidor real manda, e prova a normalização (lowercase) do `getBinary`.

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
    axiosForjado.get.mockResolvedValue({
      data: Buffer.from('ZIP'),
      headers: { 'content-type': 'application/zip' },
    });
    await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}?draft=true`)
      .set({ Authorization: `Bearer ${tokenComPermissao}` });

    // Asserta na URL que o axios recebeu, não em argumentos de um service
    // mockado: é a prova de que o parâmetro chegou até a chamada real.
    expect(axiosForjado.get.mock.calls[0][0]).toContain(
      `v1/caderno/${ID}?draft=true`,
    );
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
    //
    // Rejeita como o axios rejeita de verdade: corpo BINÁRIO, porque a
    // requisição foi feita com `responseType: 'arraybuffer'` (getBinary). É
    // o cenário que produzia as 81 chaves numéricas no corpo, e é
    // `desembrulharCorpo` (na factory) que o desfaz antes do filtro.
    axiosForjado.get.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: Buffer.from(
          JSON.stringify({
            message:
              'simulado nao esta pronto (questoes pendentes ou incompletas)',
          }),
        ),
      },
    });

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
    const r = await request(app.getHttpServer())
      .get('/mssimulado/caderno/..%2F..%2Fv1%2Fsimulado%2Foutro')
      .set({ Authorization: `Bearer ${tokenComPermissao}` });

    expect(r.status).toBe(400);
    // Mais forte do que "um service não foi chamado": prova que nenhuma
    // requisição saiu para o ms.
    expect(axiosForjado.get).not.toHaveBeenCalled();
  });
});
