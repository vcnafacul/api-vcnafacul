import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { CentralRepository } from 'src/modules/push/central/central.repository';
import { CentralService } from 'src/modules/push/central/central.service';
import { NotificacaoDoUsuario } from 'src/modules/push/central/notificacao-do-usuario.entity';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

const MIN = 60 * 1000;
const DIA = 24 * 60 * MIN;

/** Central de notificações (série `central-notificacoes`, card 02). */
describe('Central de notificações (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let central: CentralRepository;
  let service: CentralService;
  let jwt: JwtService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = createNestAppTest(mod);
    await app.init();
    db = mod.get(DataSource);
    central = mod.get(CentralRepository);
    service = mod.get(CentralService);
    jwt = mod.get(JwtService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const http = () => request(app.getHttpServer());
  const repo = () => db.getRepository(NotificacaoDoUsuario);

  const novaPessoa = async () => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `central-${randomUUID()}@teste.com`,
    };
    await app.get(UserService).create(dto);
    const u = await app.get(UserRepository).findOneBy({ email: dto.email });
    const bearer = `Bearer ${await jwt.signAsync({ user: { id: u.id } }, { expiresIn: '1h' })}`;
    return { id: u.id, bearer };
  };

  /** Grava uma notificação e ajusta datas direto no banco. */
  const notificacao = async (
    userId: string,
    titulo: string,
    { criadaHa = 0, lidaHa }: { criadaHa?: number; lidaHa?: number } = {},
  ) => {
    await central.gravar([userId], { titulo, corpo: 'c', url: '/simulados' });
    const n = await repo().findOneByOrFail({ userId, titulo });
    await repo().update(
      { id: n.id },
      {
        createdAt: new Date(Date.now() - criadaHa),
        lidaEm: lidaHa === undefined ? null : new Date(Date.now() - lidaHa),
      },
    );
    return n.id;
  };

  it('sem JWT → 401 nas três rotas', async () => {
    await http().get('/me/notificacoes').expect(401);
    await http().patch('/me/notificacoes/lidas').expect(401);
    await http().patch(`/me/notificacoes/${randomUUID()}/lida`).expect(401);
  });

  it('⚠️ não lidas + lidas há menos de 1 hora; lida há 61 min some', async () => {
    const p = await novaPessoa();
    await notificacao(p.id, 'nao-lida', { criadaHa: 3 * MIN });
    await notificacao(p.id, 'lida-59', { criadaHa: 2 * MIN, lidaHa: 59 * MIN });
    await notificacao(p.id, 'lida-61', { criadaHa: MIN, lidaHa: 61 * MIN });

    const { body } = await http()
      .get('/me/notificacoes')
      .set('Authorization', p.bearer)
      .expect(200);

    expect(body.data.map((n) => n.titulo)).toEqual(['lida-59', 'nao-lida']);
    expect(body).toMatchObject({ totalItems: 2, naoLidas: 1, page: 1 });
    expect(Object.keys(body.data[0]).sort()).toEqual(
      ['corpo', 'createdAt', 'id', 'lidaEm', 'titulo', 'url'].sort(),
    );
  });

  it('cada um vê só as suas', async () => {
    const [a, b] = await Promise.all([novaPessoa(), novaPessoa()]);
    await notificacao(a.id, 'de-a');
    const { body } = await http()
      .get('/me/notificacoes')
      .set('Authorization', b.bearer)
      .expect(200);
    expect(body).toMatchObject({ data: [], totalItems: 0, naoLidas: 0 });
  });

  it('marcar como lida; de outra pessoa → 404 e não marca', async () => {
    const [a, b] = await Promise.all([novaPessoa(), novaPessoa()]);
    const id = await notificacao(a.id, 'x');

    await http()
      .patch(`/me/notificacoes/${id}/lida`)
      .set('Authorization', b.bearer)
      .expect(404);
    expect((await repo().findOneBy({ id })).lidaEm).toBeNull();

    await http()
      .patch(`/me/notificacoes/${id}/lida`)
      .set('Authorization', a.bearer)
      .expect(204);
    expect((await repo().findOneBy({ id })).lidaEm).not.toBeNull();

    // de novo: idempotente
    await http()
      .patch(`/me/notificacoes/${id}/lida`)
      .set('Authorization', a.bearer)
      .expect(204);
    await http()
      .patch(`/me/notificacoes/nao-e-uuid/lida`)
      .set('Authorization', a.bearer)
      .expect(400);
  });

  it('⚠️ marcar todas não mexe nas já lidas nem nas de outra pessoa', async () => {
    const [a, b] = await Promise.all([novaPessoa(), novaPessoa()]);
    await notificacao(a.id, 'n1');
    await notificacao(a.id, 'n2');
    const jaLida = await notificacao(a.id, 'antiga', { lidaHa: 30 * MIN });
    const antes = (await repo().findOneBy({ id: jaLida })).lidaEm;
    const deB = await notificacao(b.id, 'de-b');

    const { body } = await http()
      .patch('/me/notificacoes/lidas')
      .set('Authorization', a.bearer)
      .expect(200);

    expect(body).toEqual({ marcadas: 2 });
    expect((await repo().findOneBy({ id: jaLida })).lidaEm).toEqual(antes);
    expect((await repo().findOneBy({ id: deB })).lidaEm).toBeNull();
  });

  it('limit acima de 50 → 400', async () => {
    const p = await novaPessoa();
    await http()
      .get('/me/notificacoes?limit=51')
      .set('Authorization', p.bearer)
      .expect(400);
  });

  it('⚠️ limpeza: lida 61 min / 59 min; não lida 31 / 29 dias', async () => {
    const p = await novaPessoa();
    const lida61 = await notificacao(p.id, 'l61', { lidaHa: 61 * MIN });
    const lida59 = await notificacao(p.id, 'l59', { lidaHa: 59 * MIN });
    const velha = await notificacao(p.id, 'n31', { criadaHa: 31 * DIA });
    const recente = await notificacao(p.id, 'n29', { criadaHa: 29 * DIA });

    await service.limpar();

    const restam = (await repo().find({ where: { userId: p.id } })).map(
      (n) => n.id,
    );
    expect(restam.sort()).toEqual([lida59, recente].sort());
    expect(restam).not.toContain(lida61);
    expect(restam).not.toContain(velha);
  });
});
