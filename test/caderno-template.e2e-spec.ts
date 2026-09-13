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
// ⚠️ Sem isto, `userService.create` quebra tentando renderizar o template
// React de confirmação de e-mail (mesmo ajuste do course-period.e2e-spec).
jest.mock('src/shared/services/email/email.service');

const BASE = '/mssimulado/caderno/template';

describe('Caderno Template (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let jwtService: JwtService;
  let roleService: RoleService;

  // ⚠️ Forjamos o axios, não o `CadernoTemplateHttpService`: mockar o service
  // tiraria a `HttpServiceAxiosFactory` inteira do caminho, e é justamente a
  // composição `handleError` (desembrulharCorpo) → `ControllerExceptionsFilter`
  // que carrega a feature deste card — o 409 do publicar COM a lista de erros
  // de lint no corpo. Trocando só a instância do axios por dentro da
  // `HttpServiceAxios` real, o resto da corrente roda com código de produção.
  const axiosForjado = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };
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
    // producao -- e a lista de erros de lint do 409 e o que este e2e prova.
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

  let tokenCoordenador: string;
  let idCoordenador: string;
  let tokenSemNada: string;
  let tokenSoVisualizarProvas: string;

  beforeAll(async () => {
    const roleCoordenador = await roleService.create(
      roleDto({ alterarPermissao: true }),
    );
    const roleSemNada = await roleService.create(roleDto());
    // ⚠️ Quem gera prova NAO mexe no layout: visualizarProvas ligado e
    // alterarPermissao desligado tem que dar 403.
    const roleSoVisualizarProvas = await roleService.create(
      roleDto({ visualizarProvas: true, alterarPermissao: false }),
    );

    const userCoordenador = await createUserWithRole(roleCoordenador);
    const userSemNada = await createUserWithRole(roleSemNada);
    const userSoVisualizarProvas = await createUserWithRole(
      roleSoVisualizarProvas,
    );

    idCoordenador = userCoordenador.id;
    tokenCoordenador = await tokenFor(userCoordenador.id);
    tokenSemNada = await tokenFor(userSemNada.id);
    tokenSoVisualizarProvas = await tokenFor(userSoVisualizarProvas.id);
  });

  beforeEach(() => {
    axiosForjado.get.mockReset();
    axiosForjado.post.mockReset();
    axiosForjado.delete.mockReset();
  });

  it('401: sem JWT', async () => {
    // ⚠️ E por isto que as rotas usam JwtAuthGuard junto: so com o
    // PermissionsGuard, o Nest traduziria a recusa para 403 e quem esta com a
    // sessao expirada nao seria mandado para o login.
    const r = await request(app.getHttpServer()).get(BASE);

    expect(r.status).toBe(401);
    expect(axiosForjado.get).not.toHaveBeenCalled();
  });

  it('403: JWT válido, sem alterarPermissao', async () => {
    const r = await request(app.getHttpServer())
      .get(BASE)
      .set({ Authorization: `Bearer ${tokenSemNada}` });

    expect(r.status).toBe(403);
    expect(axiosForjado.get).not.toHaveBeenCalled();
  });

  it('403: com visualizarProvas e SEM alterarPermissao', async () => {
    // ⚠️ O ponto do card: quem gera prova nao mexe no layout. A permissao
    // mudou em relacao ao card (alterarPermissao, nao visualizarProvas), a
    // separacao nao.
    const r = await request(app.getHttpServer())
      .get(BASE)
      .set({ Authorization: `Bearer ${tokenSoVisualizarProvas}` });

    expect(r.status).toBe(403);
    expect(axiosForjado.get).not.toHaveBeenCalled();
  });

  it('200: a versão publicada vem do ms', async () => {
    axiosForjado.get.mockResolvedValue({
      data: { versao: 4, publicadaEm: '2026-09-01T00:00:00.000Z' },
    });

    const r = await request(app.getHttpServer())
      .get(BASE)
      .set({ Authorization: `Bearer ${tokenCoordenador}` });

    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      versao: 4,
      publicadaEm: '2026-09-01T00:00:00.000Z',
    });
    expect(axiosForjado.get.mock.calls[0][0]).toBe(
      'http://ms-forjado/v1/caderno/template',
    );
  });

  it('409 do publicar: a LISTA de erros de lint chega no corpo', async () => {
    // ⚠️ O teste mais importante deste card. O ms responde
    // { message, erros } e a tela do card 13 mostra `erros` item a item. Se o
    // ControllerExceptionsFilter (ou o desembrulharCorpo antes dele) trocar
    // isso por um "Conflito" generico, a tela fica sem ter o que mostrar e
    // NADA falha -- nenhum teste unitario pega, nenhum log acusa.
    //
    // Rejeita como o axios rejeita de verdade num POST comum: `response.data`
    // ja e o objeto JSON parseado (o corpo binario so aparece no getBinary,
    // que o publicar nao usa).
    const errosDoLint = [
      'linha 12: \\usepackage{minted} nao permitido',
      'falta o marcador %%QUESTOES%%',
      'main.tex nao encontrado na raiz do zip',
    ];

    axiosForjado.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          message: 'o rascunho nao passou no lint estrutural',
          erros: errosDoLint,
          avisos: ['imagem logo.png com 4.1 MB'],
        },
      },
    });

    const r = await request(app.getHttpServer())
      .post(`${BASE}/rascunho/publicar`)
      .set({ Authorization: `Bearer ${tokenCoordenador}` });

    expect(r.status).toBe(409);
    // O conteudo da lista, nao so o status: um teste que so olha o 409 passa
    // verde com o corpo destruido, que e precisamente o defeito.
    expect(r.body.erros).toEqual(errosDoLint);
    expect(r.body.avisos).toEqual(['imagem logo.png com 4.1 MB']);
    expect(r.body.message).toBe('o rascunho nao passou no lint estrutural');
    // Nenhuma chave numerica: e a assinatura de um Buffer espalhado.
    expect(Object.keys(r.body).filter((k) => /^\d+$/.test(k))).toEqual([]);
  });

  it('200 do POST /rascunho com lint sujo: { aceitos, ignorados, erros, avisos } íntegro', async () => {
    // Lint reprovado NAO e erro de upload: o rascunho foi criado e o relatorio
    // do lint volta no corpo de sucesso. E o que a tela do card 13 mostra
    // antes de o coordenador decidir publicar.
    const relatorio = {
      versao: 5,
      aceitos: ['main.tex', 'estilos/prova.sty'],
      ignorados: ['.git/config', 'main.aux'],
      erros: ['linha 12: \\usepackage{minted} nao permitido'],
      avisos: ['imagem logo.png com 4.1 MB'],
    };
    axiosForjado.post.mockResolvedValue({ data: relatorio });

    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe, 0x00, 0x01]);

    const r = await request(app.getHttpServer())
      .post(`${BASE}/rascunho`)
      .set({ Authorization: `Bearer ${tokenCoordenador}` })
      .field('notas', 'primeira versao do Overleaf')
      .attach('arquivo', zip, 'template.zip');

    // ⚠️ 200, nao 201: o ms responde 200 de proposito (o endpoint devolve um
    // relatorio, nao cria recurso) e a api e proxy 1:1. Um 201 aqui obrigaria
    // o card 13 a conhecer dois codigos para a mesma coisa.
    expect(r.status).toBe(200);
    expect(r.body).toEqual(relatorio);

    // O multipart reenviado ao ms: o zip tem que chegar como ARQUIVO. Um
    // append sem filename transformaria o buffer em texto sem erro nenhum.
    const [rota, corpo] = axiosForjado.post.mock.calls[0];
    expect(rota).toBe('http://ms-forjado/v1/caderno/template/rascunho');
    expect(corpo).toBeInstanceOf(FormData);
    const enviado = (corpo as FormData).get('arquivo') as File;
    expect(enviado).toBeInstanceOf(File);
    expect(enviado.name).toBe('template.zip');
    expect(Buffer.from(await enviado.arrayBuffer())).toEqual(zip);
    // criadorId sai do JWT, nunca do corpo.
    expect((corpo as FormData).get('criadorId')).toBe(idCoordenador);
    expect((corpo as FormData).get('notas')).toBe(
      'primeira versao do Overleaf',
    );
  });

  it('GET /teste: o zip chega byte-idêntico ao que o ms devolveu', async () => {
    // Bytes fora do ASCII de proposito: em texto utf8 eles viram U+FFFD e a
    // comparacao acusa. Com um zip "PKfake" qualquer corrupcao passaria.
    const zipDoMs = Buffer.from([
      0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0xfe, 0x80, 0x7f, 0x01,
    ]);
    axiosForjado.get.mockResolvedValue({
      data: zipDoMs,
      headers: { 'content-type': 'application/zip' },
    });

    const r = await request(app.getHttpServer())
      .get(`${BASE}/teste?versao=3`)
      .set({ Authorization: `Bearer ${tokenCoordenador}` })
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
    expect(r.headers['content-type']).toContain('application/zip');
    expect(r.headers['content-disposition']).toBe(
      'attachment; filename="caderno-template-teste.zip"',
    );
    expect(r.body).toEqual(zipDoMs);
    expect(axiosForjado.get.mock.calls[0][0]).toBe(
      'http://ms-forjado/v1/caderno/template/teste?versao=3',
    );
  });

  it('400: ?rascunho=xis não alcança o ms', async () => {
    // ⚠️ A api MONTA a rota interna a partir de tipos, nao repassa o texto
    // recebido: sem a validacao aqui, `?rascunho=xis` viraria o literal
    // `?rascunho=1` em silencio e o 400 do ms nunca dispararia.
    const r = await request(app.getHttpServer())
      .get(`${BASE}/teste?rascunho=xis`)
      .set({ Authorization: `Bearer ${tokenCoordenador}` });

    expect(r.status).toBe(400);
    expect(r.body.message).toContain('rascunho');
    // Mais forte do que "um service nao foi chamado": prova que nenhuma
    // requisicao saiu para o ms.
    expect(axiosForjado.get).not.toHaveBeenCalled();
  });
});
