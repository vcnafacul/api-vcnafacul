import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { EnvService } from 'src/shared/modules/env/env.service';
import { PartnerPrepCourseController } from './partner-prep-course.controller';
import { PartnerPrepCourseService } from './partner-prep-course.service';
import { CursinhoPaginaService } from './pagina/cursinho-pagina.service';
import { Permissions } from 'src/modules/role/permissions/permissions';

/**
 * As rotas novas do card 02 de `convite-de-colaborador` chegam no handler
 * certo.
 *
 * ⚠️ **Só um app de verdade pega colisão de rota** — ela nasce no roteamento,
 * não no controller. `role/atribuiveis` convive com `GET role` e `GET :id`.
 */
describe('PartnerPrepCourseController — rotas da troca de função', () => {
  let app: INestApplication;

  const service = {
    getRoles: jest.fn().mockResolvedValue([]),
    getRolesAtribuiveis: jest.fn().mockResolvedValue([{ id: 'r-prof' }]),
    atribuirFuncao: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue({}),
  };

  const paginaService = {
    paraEdicao: jest.fn().mockResolvedValue({ slug: 'x' }),
    salvar: jest.fn().mockResolvedValue({ slug: 'y' }),
  };

  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'gestor' };
      return true;
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [PartnerPrepCourseController],
      providers: [
        { provide: PartnerPrepCourseService, useValue: service },
        { provide: CursinhoPaginaService, useValue: paginaService },
        // O guard do convite (card 01) é um mixin que injeta o EnvService.
        { provide: EnvService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue(passaTudo)
      .compile();

    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('GET role/atribuiveis chega no getRolesAtribuiveis — não no getRoles nem no :id', async () => {
    await request(app.getHttpServer())
      .get('/partner-prep-course/role/atribuiveis')
      .expect(200);

    expect(service.getRolesAtribuiveis).toHaveBeenCalledWith('gestor');
    expect(service.getRoles).not.toHaveBeenCalled();
    expect(service.getById).not.toHaveBeenCalled();
  });

  it('PATCH collaborator-role repassa quem pede, o alvo e a função', async () => {
    await request(app.getHttpServer())
      .patch('/partner-prep-course/collaborator-role')
      .send({ userId: 'ana', roleId: 'r1' })
      .expect(200);

    expect(service.atribuirFuncao).toHaveBeenCalledWith('gestor', 'ana', 'r1');
  });

  // ---- tickets/025, card 01 ----

  it('GET pagina chega no paraEdicao — não no :id', async () => {
    await request(app.getHttpServer())
      .get('/partner-prep-course/pagina')
      .expect(200);
    expect(paginaService.paraEdicao).toHaveBeenCalledWith('gestor');
    expect(service.getById).not.toHaveBeenCalled();
  });

  it('PUT pagina repassa quem pede e o corpo', async () => {
    const corpo = {
      slug: 'y',
      active: false,
      linksPublicos: [],
      linksInternos: [],
    };
    await request(app.getHttpServer())
      .put('/partner-prep-course/pagina')
      .send(corpo)
      .expect(200);
    expect(paginaService.salvar).toHaveBeenCalledWith('gestor', corpo);
  });

  it('⚠️ pagina: gerenciarPermissoesCursinho OU gerenciarEstudantes, na rota', () => {
    const proto = PartnerPrepCourseController.prototype;
    for (const handler of [proto.getPagina, proto.salvarPagina]) {
      expect(Reflect.getMetadata(PermissionsGuard.name, handler)).toEqual([
        Permissions.gerenciarPermissoesCursinho,
        Permissions.gerenciarEstudantes,
      ]);
    }
  });
});
