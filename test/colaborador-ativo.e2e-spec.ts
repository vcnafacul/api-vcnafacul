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
import { Collaborator } from 'src/modules/prepCourse/collaborator/collaborator.entity';
import { PartnerPrepCourse } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.entity';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
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
 * Inativar/reativar colaborador (tickets-documentacao, card 02) contra o MySQL
 * real, com JWT e `PermissionsGuard` de verdade.
 *
 * ⚠️ Antes, a rota não conferia o cursinho: o gestor de um cursinho inativava
 * (e rebaixava para `aluno`) colaborador de outro, o admin ou a si mesmo — e
 * reativar não devolvia a função.
 */
describe('Ativar e inativar colaborador (e2e)', () => {
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

  const novoUsuario = async () => {
    const dto = CreateUserDtoInputFaker();
    await userService.create(dto);
    return userRepository.findOneBy({ email: dto.email });
  };

  /** Um cursinho com as funções Coordenação (admin), Gestão e Professor. */
  async function cursinho() {
    const representante = await novoUsuario();
    representante.role = await roleService.findOneBy({ name: 'admin' });
    await userRepository.update(representante);
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const { id } = await partnerPrepCourseService.create(
      { geoId: geo.id, representative: representante.id },
      representante.id,
    );
    const funcao = (nome: string, permissoes: object) =>
      partnerPrepCourseService.createRole(
        {
          name: `${nome} ${Date.now()}-${Math.random()}`,
          base: false,
          ...permissoes,
        } as any,
        representante.id,
      ) as Promise<Role>;
    return {
      id,
      coordenacao: await funcao('Coordenação', {
        gerenciarColaboradores: true,
        gerenciarPermissoesCursinho: true,
      }),
      gestao: await funcao('Gestão', { gerenciarColaboradores: true }),
      professor: await funcao('Professor', {}),
    };
  }

  /** Colaborador ativo do cursinho, com a função dada, e o token dele. */
  async function membro(cursinhoId: string, funcao: Role) {
    const user = await novoUsuario();
    user.role = funcao;
    await userRepository.update(user);
    const colab = await dataSource.getRepository(Collaborator).save(
      Object.assign(new Collaborator(), {
        user,
        partnerPrepCourse: { id: cursinhoId } as PartnerPrepCourse,
        actived: true,
      }),
    );
    const token = await jwtService.signAsync({ user: { id: user.id } });
    return { userId: user.id, colabId: colab.id, token };
  }

  const ativo = (token: string, colabId: string, body?: object) => {
    const r = request(app.getHttpServer())
      .patch(`/collaborator/${colabId}/active`)
      .set({ Authorization: `Bearer ${token}` });
    return body ? r.send(body) : r;
  };

  const estado = async (colabId: string, userId: string) => {
    const [c] = await dataSource.query(
      `SELECT actived, role_before_inactive_id AS guardada FROM collaborators WHERE id = ?`,
      [colabId],
    );
    const u = await userRepository.findOneBy({ id: userId });
    return {
      actived: !!Number(c.actived),
      guardada: c.guardada,
      role: u.role.name,
    };
  };

  it('inativar → reativar devolve a função original (gestão, sem ser admin)', async () => {
    const c = await cursinho();
    const gestor = await membro(c.id, c.gestao);
    const prof = await membro(c.id, c.professor);

    const inativou = await ativo(gestor.token, prof.colabId, {
      actived: false,
    }).expect(200);
    expect(inativou.body).toMatchObject({
      actived: false,
      role: { name: 'aluno' },
      funcaoRestaurada: false,
    });
    expect(await estado(prof.colabId, prof.userId)).toEqual({
      actived: false,
      guardada: c.professor.id,
      role: 'aluno',
    });

    const reativou = await ativo(gestor.token, prof.colabId, {
      actived: true,
    }).expect(200);
    expect(reativou.body).toMatchObject({
      actived: true,
      role: { id: c.professor.id },
      funcaoRestaurada: true,
    });
    expect(await estado(prof.colabId, prof.userId)).toEqual({
      actived: true,
      guardada: null,
      role: c.professor.name,
    });

    const [log] = await dataSource.query(
      `SELECT COUNT(*) AS n FROM log_partner WHERE partner_id = ? AND description LIKE 'Colaborador %'`,
      [c.id],
    );
    expect(Number(log.n)).toBe(2);
  });

  it('sem corpo alterna, como o client antigo', async () => {
    const c = await cursinho();
    const gestor = await membro(c.id, c.gestao);
    const prof = await membro(c.id, c.professor);
    await ativo(gestor.token, prof.colabId).expect(200);
    expect((await estado(prof.colabId, prof.userId)).actived).toBe(false);
    await ativo(gestor.token, prof.colabId).expect(200);
    expect(await estado(prof.colabId, prof.userId)).toMatchObject({
      actived: true,
      role: c.professor.name,
    });
  });

  it('⚠️ colaborador de OUTRO cursinho → 403 e nada muda', async () => {
    const A = await cursinho();
    const B = await cursinho();
    const gestorDeA = await membro(A.id, A.gestao);
    const profDeB = await membro(B.id, B.professor);

    await ativo(gestorDeA.token, profDeB.colabId, { actived: false }).expect(
      403,
    );
    expect(await estado(profDeB.colabId, profDeB.userId)).toEqual({
      actived: true,
      guardada: null,
      role: B.professor.name,
    });
  });

  it('⚠️ gestão não inativa a coordenação (admin) do cursinho → 403', async () => {
    const c = await cursinho();
    const gestor = await membro(c.id, c.gestao);
    const coord = await membro(c.id, c.coordenacao);
    const r = await ativo(gestor.token, coord.colabId, {
      actived: false,
    }).expect(403);
    expect(r.body.message).toContain('Só o administrador do cursinho');
    expect((await estado(coord.colabId, coord.userId)).role).toBe(
      c.coordenacao.name,
    );
  });

  it('⚠️ ninguém inativa a si mesmo → 403', async () => {
    const c = await cursinho();
    const coord = await membro(c.id, c.coordenacao);
    await ativo(coord.token, coord.colabId, { actived: false }).expect(403);
    expect((await estado(coord.colabId, coord.userId)).actived).toBe(true);
  });

  it('a coordenação inativa e reativa outra coordenação, que volta como admin', async () => {
    const c = await cursinho();
    const coord = await membro(c.id, c.coordenacao);
    const outra = await membro(c.id, c.coordenacao);
    await ativo(coord.token, outra.colabId, { actived: false }).expect(200);
    await ativo(coord.token, outra.colabId, { actived: true }).expect(200);
    expect((await estado(outra.colabId, outra.userId)).role).toBe(
      c.coordenacao.name,
    );
  });

  it('⚠️ descrição de colaborador de OUTRO cursinho → 404', async () => {
    const A = await cursinho();
    const B = await cursinho();
    const gestorDeA = await membro(A.id, A.gestao);
    const profDeB = await membro(B.id, B.professor);
    await request(app.getHttpServer())
      .patch(`/collaborator/${profDeB.colabId}/description`)
      .set({ Authorization: `Bearer ${gestorDeA.token}` })
      .send({ description: 'invadido' })
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/collaborator/${profDeB.colabId}/description`)
      .set({ Authorization: `Bearer ${(await membro(B.id, B.gestao)).token}` })
      .send({ description: 'do próprio cursinho' })
      .expect(200);
  });
});
