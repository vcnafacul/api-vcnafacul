import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash, randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { AuditLog } from 'src/modules/audit-log/audit-log.entity';
import { PushCleanupTask } from 'src/modules/push/push-cleanup.task';
import { PushDevice } from 'src/modules/push/push-device.entity';
import { PushDeviceRepository } from 'src/modules/push/push-device.repository';
import {
  PushNotification,
  StatusDoEnvio,
} from 'src/modules/push/push-notification.entity';
import { PushService } from 'src/modules/push/push.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { RoleService } from 'src/modules/role/role.service';
import { User } from 'src/modules/user/user.entity';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { FirebaseService } from 'src/shared/modules/firebase/firebase.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { DataSource } from 'typeorm';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/**
 * PushService com o banco de verdade (série `pwa-push`, BE-05). O FCM é
 * forjado — nada aqui fala com o Google. O que se prova é a resolução do
 * público (a query) e o que o envio grava de volta no banco.
 */
describe('PushService (e2e)', () => {
  let app: INestApplication;
  let push: PushService;
  let devices: PushDeviceRepository;
  let userService: UserService;
  let userRepository: UserRepository;
  let roleService: RoleService;
  let dataSource: DataSource;
  let jwtService: JwtService;
  /** A flag `PUSH_ENABLED`, trocável por teste. */
  let pushLigado = true;

  /** Token → resposta do FCM. Sem entrada = sucesso. */
  const respostaDoFcm = new Map<string, string>();
  const sendEachForMulticast = jest.fn(async ({ tokens }) => {
    const responses = tokens.map((t: string) =>
      respostaDoFcm.has(t)
        ? { success: false, error: { code: respostaDoFcm.get(t) } }
        : { success: true, messageId: 'm' },
    );
    return {
      responses,
      successCount: responses.filter((r) => r.success).length,
      failureCount: responses.filter((r) => !r.success).length,
    };
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideProvider(FirebaseService)
      .useValue({
        isEnabled: () => true,
        messaging: () => ({ sendEachForMulticast }),
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    await app.init();

    const env = moduleFixture.get(EnvService);
    const getOriginal = env.get.bind(env);
    jest
      .spyOn(env, 'get')
      .mockImplementation((k: any) =>
        k === 'PUSH_ENABLED' ? pushLigado : getOriginal(k),
      );

    push = moduleFixture.get(PushService);
    devices = moduleFixture.get(PushDeviceRepository);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
    roleService = moduleFixture.get(RoleService);
    dataSource = moduleFixture.get(DataSource);
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    sendEachForMulticast.mockClear();
    respostaDoFcm.clear();
    pushLigado = true;
    await dataSource.getRepository(PushDevice).clear();
  });

  const novaRole = () =>
    roleService.create({
      name: `Push ${randomUUID()}`,
      base: false,
    } as CreateRoleDtoInput);

  const novoUsuario = async (email?: string) => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: email ?? `push-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    return (
      userRepository.findOneBy({ email: dto.email.toLowerCase() }) ??
      userRepository.findOneBy({ email: dto.email })
    );
  };

  /** Usuário com `enviarNotificacao` — o único que pode "enviar teste". */
  const novoRemetente = async () => {
    const role = await roleService.create({
      name: `Push remetente ${randomUUID()}`,
      base: false,
      enviarNotificacao: true,
    } as CreateRoleDtoInput);
    const u = await novoUsuario();
    u.role = role;
    await userRepository.update(u);
    return u;
  };

  const novoAparelho = async (userId: string, apagado = false) => {
    const token = `tok-${randomUUID()}`;
    const d = Object.assign(new PushDevice(), {
      userId,
      token,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      deletedAt: apagado ? new Date() : null,
    });
    await dataSource.getRepository(PushDevice).save(d);
    return d;
  };

  const tokensDe = async (
    publico: Parameters<PushService['resolverPublico']>[0],
  ) =>
    (await push.resolverPublico(publico)).aparelhos.map((a) => a.token).sort();

  it('users: só os aparelhos ATIVOS daqueles usuários', async () => {
    const [a, b] = await Promise.all([novoUsuario(), novoUsuario()]);
    const a1 = await novoAparelho(a.id);
    const a2 = await novoAparelho(a.id);
    await novoAparelho(a.id, true); // desativado
    await novoAparelho(b.id); // outro usuário

    expect(await tokensDe({ type: 'users', userIds: [a.id] })).toEqual(
      [a1.token, a2.token].sort(),
    );
    const r = await push.resolverPublico({ type: 'users', userIds: [a.id] });
    expect(r).toMatchObject({ targetUsers: 1, targetDevices: 2 });
  });

  it('emails: sem diferenciar maiúsculas e com espaços', async () => {
    const email = `push-${randomUUID()}@teste.com`;
    const u = await novoUsuario(email);
    const d = await novoAparelho(u.id);

    expect(
      await tokensDe({ type: 'emails', emails: [`  ${email.toUpperCase()} `] }),
    ).toEqual([d.token]);
  });

  it('roles: quem tem a função', async () => {
    const role = await novaRole();
    const [dentro, fora] = await Promise.all([novoUsuario(), novoUsuario()]);
    dentro.role = role;
    await userRepository.update(dentro);
    const d = await novoAparelho(dentro.id);
    await novoAparelho(fora.id);

    expect(await tokensDe({ type: 'roles', roleIds: [role.id] })).toEqual([
      d.token,
    ]);
  });

  it('all: todo aparelho ativo', async () => {
    const [a, b] = await Promise.all([novoUsuario(), novoUsuario()]);
    const da = await novoAparelho(a.id);
    const db = await novoAparelho(b.id);
    await novoAparelho(b.id, true);

    expect(await tokensDe({ type: 'all' })).toEqual(
      [da.token, db.token].sort(),
    );
  });

  it('⚠️ usuário que apagou a conta (soft delete) não recebe', async () => {
    const u = await novoUsuario();
    await novoAparelho(u.id);
    // ⚠️ Não é `userService.deleteUser`: ele chama o `softDelete` do TypeORM,
    // que exige `@DeleteDateColumn` — o `BaseEntity` tem `deleted_at` como
    // coluna comum, e o método quebra (código sem uso hoje). O resto do
    // sistema entende conta apagada como `deleted_at` preenchido.
    await dataSource
      .createQueryBuilder()
      .update('users')
      .set({ deletedAt: new Date() })
      .where('id = :id', { id: u.id })
      .execute();

    expect(await tokensDe({ type: 'users', userIds: [u.id] })).toEqual([]);
    expect(await tokensDe({ type: 'all' })).toEqual([]);
  });

  it('listas vazias não viram "todo mundo"', async () => {
    const u = await novoUsuario();
    await novoAparelho(u.id);

    expect(await tokensDe({ type: 'users', userIds: [] })).toEqual([]);
    expect(await tokensDe({ type: 'emails', emails: ['  '] })).toEqual([]);
    expect(await tokensDe({ type: 'roles', roleIds: [] })).toEqual([]);
  });

  it('send grava o envio e desativa no banco só o token morto', async () => {
    const u = await novoUsuario();
    const vivo = await novoAparelho(u.id);
    const morto = await novoAparelho(u.id);
    const instavel = await novoAparelho(u.id);
    respostaDoFcm.set(
      morto.token,
      'messaging/registration-token-not-registered',
    );
    respostaDoFcm.set(instavel.token, 'messaging/internal-error');

    const envio = await push.send(
      { title: 'Oi', body: 'Teste', url: '/simulados' },
      { type: 'users', userIds: [u.id] },
      u.id,
    );

    const salvo = await dataSource
      .getRepository(PushNotification)
      .findOneBy({ id: envio.id });
    expect(salvo).toMatchObject({
      status: StatusDoEnvio.done,
      targetUsers: 1,
      targetDevices: 3,
      successCount: 1,
      failureCount: 2,
      sentById: u.id,
      audience: { type: 'users', userIds: [u.id] },
    });
    expect(salvo.finishedAt).not.toBeNull();

    const ativos = await devices.ativosDoPublico({
      type: 'users',
      userIds: [u.id],
    });
    expect(ativos.map((a) => a.id).sort()).toEqual(
      [vivo.id, instavel.id].sort(),
    );
  });

  describe('endpoints de aparelho (BE-04)', () => {
    const http = () => request(app.getHttpServer());
    const bearer = async (userId: string) =>
      `Bearer ${await jwtService.signAsync({ user: { id: userId } }, { expiresIn: '1h' })}`;
    const linhasDoToken = (token: string) =>
      dataSource.getRepository(PushDevice).find({
        where: { token },
      });
    const corpo = (token: string) => ({
      token,
      platform: 'android',
      standalone: true,
      userAgent: 'Chrome/Android',
    });

    it('sem JWT → 401 no registrar, no listar e no teste', async () => {
      await http().post('/push/devices').send(corpo('t')).expect(401);
      await http().get('/push/devices/me').expect(401);
      await http().post('/push/test').expect(401);
    });

    it('registrar duas vezes o mesmo token não duplica', async () => {
      const u = await novoUsuario();
      const auth = await bearer(u.id);
      const token = `tok-${randomUUID()}`;

      await http()
        .post('/push/devices')
        .set('Authorization', auth)
        .send(corpo(token))
        .expect(204);
      const [primeira] = await linhasDoToken(token);
      await http()
        .post('/push/devices')
        .set('Authorization', auth)
        .send(corpo(token))
        .expect(204);

      const linhas = await linhasDoToken(token);
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({
        id: primeira.id,
        userId: u.id,
        platform: 'android',
        standalone: true,
        userAgent: 'Chrome/Android',
      });
    });

    it('⚠️ registros simultâneos do mesmo token não estouram o índice único', async () => {
      const u = await novoUsuario();
      const auth = await bearer(u.id);
      const token = `tok-${randomUUID()}`;

      const respostas = await Promise.all(
        Array.from({ length: 5 }, () =>
          http()
            .post('/push/devices')
            .set('Authorization', auth)
            .send(corpo(token)),
        ),
      );

      expect(respostas.map((r) => r.status)).toEqual([204, 204, 204, 204, 204]);
      expect(await linhasDoToken(token)).toHaveLength(1);
    });

    it('⚠️ token registrado por A e depois por B passa a ser só de B', async () => {
      const [a, b] = await Promise.all([novoUsuario(), novoUsuario()]);
      const token = `tok-${randomUUID()}`;

      await http()
        .post('/push/devices')
        .set('Authorization', await bearer(a.id))
        .send(corpo(token))
        .expect(204);
      await http()
        .post('/push/devices')
        .set('Authorization', await bearer(b.id))
        .send(corpo(token))
        .expect(204);

      expect(await tokensDe({ type: 'users', userIds: [a.id] })).toEqual([]);
      expect(await tokensDe({ type: 'users', userIds: [b.id] })).toEqual([
        token,
      ]);
    });

    it('DELETE sem JWT remove; token inexistente também responde 204', async () => {
      const u = await novoUsuario();
      const token = `tok-${randomUUID()}`;
      await http()
        .post('/push/devices')
        .set('Authorization', await bearer(u.id))
        .send(corpo(token))
        .expect(204);

      await http().delete('/push/devices').send({ token }).expect(204);
      await http()
        .delete('/push/devices')
        .send({ token: 'nunca-existiu' })
        .expect(204);

      expect(await tokensDe({ type: 'users', userIds: [u.id] })).toEqual([]);
    });

    it('⚠️ registrar de novo um token removido RESTAURA a mesma linha', async () => {
      const u = await novoUsuario();
      const auth = await bearer(u.id);
      const token = `tok-${randomUUID()}`;
      await http()
        .post('/push/devices')
        .set('Authorization', auth)
        .send(corpo(token))
        .expect(204);
      const [original] = await linhasDoToken(token);
      await http().delete('/push/devices').send({ token }).expect(204);

      await http()
        .post('/push/devices')
        .set('Authorization', auth)
        .send(corpo(token))
        .expect(204);

      const linhas = await linhasDoToken(token);
      expect(linhas).toHaveLength(1);
      expect(linhas[0].id).toBe(original.id);
      expect(linhas[0].deletedAt).toBeNull();
    });

    it('GET /push/devices/me lista só os aparelhos ativos do próprio usuário', async () => {
      const [u, outro] = await Promise.all([novoUsuario(), novoUsuario()]);
      const ativo = await novoAparelho(u.id);
      await novoAparelho(u.id, true);
      await novoAparelho(outro.id);

      const { body } = await http()
        .get('/push/devices/me')
        .set('Authorization', await bearer(u.id))
        .expect(200);

      expect(body.map((d) => d.id)).toEqual([ativo.id]);
      expect(body[0].token).toBeUndefined();
      expect(body[0].tokenHash).toBeUndefined();
    });

    it('⚠️ POST /push/test sem a permissão enviarNotificacao → 403', async () => {
      const u = await novoUsuario();
      await novoAparelho(u.id);
      await http()
        .post('/push/test')
        .set('Authorization', await bearer(u.id))
        .expect(403);
      expect(sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('POST /push/test envia para os aparelhos do próprio usuário', async () => {
      const [u, outro] = await Promise.all([novoRemetente(), novoUsuario()]);
      const d1 = await novoAparelho(u.id);
      const d2 = await novoAparelho(u.id);
      await novoAparelho(outro.id);

      const { body } = await http()
        .post('/push/test')
        .set('Authorization', await bearer(u.id))
        .expect(200);

      expect(body).toEqual({ successCount: 2, failureCount: 0 });
      const [mensagem] = sendEachForMulticast.mock.calls[0];
      expect(mensagem.tokens.sort()).toEqual([d1.token, d2.token].sort());
      expect(mensagem.data).toMatchObject({ url: '/', tag: 'teste' });
    });

    it('PUSH_ENABLED=false → 503 no registrar e no teste; o DELETE continua funcionando', async () => {
      const u = await novoRemetente();
      const auth = await bearer(u.id);
      const d = await novoAparelho(u.id);
      pushLigado = false;

      await http()
        .post('/push/devices')
        .set('Authorization', auth)
        .send(corpo('x'))
        .expect(503);
      await http().post('/push/test').set('Authorization', auth).expect(503);
      await http().delete('/push/devices').send({ token: d.token }).expect(204);

      expect(await tokensDe({ type: 'users', userIds: [u.id] })).toEqual([]);
    });

    it('validação: token vazio ou plataforma fora do enum → 400; userAgent longo é cortado', async () => {
      const u = await novoUsuario();
      const auth = await bearer(u.id);

      await http()
        .post('/push/devices')
        .set('Authorization', auth)
        .send({ token: '' })
        .expect(400);
      await http()
        .post('/push/devices')
        .set('Authorization', auth)
        .send({ token: 't', platform: 'windows-phone' })
        .expect(400);
      await http().delete('/push/devices').send({}).expect(400);

      const token = `tok-${randomUUID()}`;
      await http()
        .post('/push/devices')
        .set('Authorization', auth)
        .send({ token, userAgent: 'x'.repeat(2000) })
        .expect(204);
      const [linha] = await linhasDoToken(token);
      expect(linha.userAgent).toHaveLength(512);
      expect(linha.platform).toBe('other');
    });

    it('⚠️ "sair de todos os dispositivos" desativa os aparelhos do usuário', async () => {
      const [u, outro] = await Promise.all([novoUsuario(), novoUsuario()]);
      await novoAparelho(u.id);
      await novoAparelho(u.id);
      const doOutro = await novoAparelho(outro.id);

      await http()
        .post('/user/logout-all')
        .set('Authorization', await bearer(u.id))
        .expect(200);

      expect(await tokensDe({ type: 'users', userIds: [u.id] })).toEqual([]);
      expect(await tokensDe({ type: 'users', userIds: [outro.id] })).toEqual([
        doOutro.token,
      ]);
    });
  });

  describe('limpeza diária (BE-07)', () => {
    const DIA = 24 * 60 * 60 * 1000;
    const agora = new Date();
    const diasAtras = (n: number) => new Date(agora.getTime() - n * DIA);

    const aparelhoCom = async (
      userId: string,
      campos: { lastSeenAt: Date; deletedAt?: Date | null },
    ) => {
      const d = await novoAparelho(userId);
      await dataSource.getRepository(PushDevice).update(d.id, {
        lastSeenAt: campos.lastSeenAt,
        deletedAt: campos.deletedAt ?? null,
      });
      return d.id;
    };
    const buscar = (id: string) =>
      dataSource.getRepository(PushDevice).findOneBy({ id });

    it('59 dias sem uso → mantém; 61 → desativa; desativado há 31 → apaga; há 29 → mantém', async () => {
      const u = await novoUsuario();
      const usado59 = await aparelhoCom(u.id, { lastSeenAt: diasAtras(59) });
      const parado61 = await aparelhoCom(u.id, { lastSeenAt: diasAtras(61) });
      const desativado31 = await aparelhoCom(u.id, {
        lastSeenAt: diasAtras(90),
        deletedAt: diasAtras(31),
      });
      const desativado29 = await aparelhoCom(u.id, {
        lastSeenAt: diasAtras(90),
        deletedAt: diasAtras(29),
      });

      const r = await app.get(PushCleanupTask).limpar(agora);

      expect(r).toEqual({ desativados: 1, apagados: 1 });
      expect((await buscar(usado59)).deletedAt).toBeNull();
      expect((await buscar(parado61)).deletedAt).not.toBeNull();
      expect(await buscar(desativado31)).toBeNull();
      expect(await buscar(desativado29)).not.toBeNull();
    });

    it('⚠️ rodar duas vezes dá no mesmo (sem lock)', async () => {
      const u = await novoUsuario();
      const parado = await aparelhoCom(u.id, { lastSeenAt: diasAtras(61) });
      const task = app.get(PushCleanupTask);

      await task.limpar(agora);
      const desativadoEm = (await buscar(parado)).deletedAt;
      const segunda = await task.limpar(agora);

      expect(segunda).toEqual({ desativados: 0, apagados: 0 });
      expect((await buscar(parado)).deletedAt).toEqual(desativadoEm);
    });

    it('o aparelho recém-desativado não é apagado na mesma rodada', async () => {
      const u = await novoUsuario();
      const parado = await aparelhoCom(u.id, { lastSeenAt: diasAtras(400) });

      await app.get(PushCleanupTask).limpar(agora);

      expect(await buscar(parado)).not.toBeNull();
    });
  });

  describe('tela admin (BE-06)', () => {
    const http = () => request(app.getHttpServer());
    const bearer = async (userId: string) =>
      `Bearer ${await jwtService.signAsync({ user: { id: userId } }, { expiresIn: '1h' })}`;

    let admin: string; // Authorization de quem TEM enviarNotificacao
    let adminId: string;
    let semPermissao: string;

    beforeAll(async () => {
      const [roleAdmin, roleComum] = await Promise.all([
        roleService.create({
          name: `Push admin ${randomUUID()}`,
          base: false,
          enviarNotificacao: true,
        } as CreateRoleDtoInput),
        novaRole(),
      ]);
      const [a, b] = await Promise.all([novoUsuario(), novoUsuario()]);
      a.role = roleAdmin;
      b.role = roleComum;
      await Promise.all([userRepository.update(a), userRepository.update(b)]);
      adminId = a.id;
      admin = await bearer(a.id);
      semPermissao = await bearer(b.id);
    });

    const corpo = (audience: object, extra: object = {}) => ({
      title: 'Aviso',
      body: 'Corpo do aviso',
      url: '/simulados',
      audience,
      ...extra,
    });

    /** O envio roda em segundo plano: espera o detalhe sair de `sending`. */
    const esperarTerminar = async (id: string) => {
      for (let i = 0; i < 50; i++) {
        const { body } = await http()
          .get(`/push/notifications/${id}`)
          .set('Authorization', admin)
          .expect(200);
        if (body.status !== 'sending') return body;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error('envio não terminou');
    };

    it('sem JWT → 401; sem a permissão → 403 (nas 4 rotas)', async () => {
      const rotas = [
        () =>
          http()
            .post('/push/audience/preview')
            .send({ audience: { type: 'all' } }),
        () =>
          http()
            .post('/push/send')
            .send(corpo({ type: 'all' })),
        () => http().get('/push/notifications'),
        () => http().get(`/push/notifications/${randomUUID()}`),
      ];
      for (const rota of rotas) {
        await rota().expect(401);
        await rota().set('Authorization', semPermissao).expect(403);
      }
    });

    describe('GET /push/recipients', () => {
      it('sem JWT → 401; sem a permissão → 403', async () => {
        await http().get('/push/recipients?q=a').expect(401);
        await http()
          .get('/push/recipients?q=a')
          .set('Authorization', semPermissao)
          .expect(403);
      });

      it('acha por nome e por e-mail, com os aparelhos ATIVOS de cada um', async () => {
        const marca = randomUUID().slice(0, 8);
        const u = await novoUsuario(`busca-${marca}@teste.com`);
        u.firstName = `Zuleica${marca}`;
        u.lastName = 'Pereira';
        await userRepository.update(u);
        await novoAparelho(u.id);
        await novoAparelho(u.id);
        await novoAparelho(u.id, true);

        const porNome = await http()
          .get(
            `/push/recipients?q=${encodeURIComponent(`Zuleica${marca} Pereira`)}`,
          )
          .set('Authorization', admin)
          .expect(200);
        expect(porNome.body).toEqual([
          {
            id: u.id,
            name: `Zuleica${marca} Pereira`,
            email: `busca-${marca}@teste.com`,
            devices: 2,
          },
        ]);

        const porEmail = await http()
          .get(`/push/recipients?q=busca-${marca}`)
          .set('Authorization', admin)
          .expect(200);
        expect(porEmail.body.map((d) => d.id)).toEqual([u.id]);
      });

      it('sem aparelho aparece com 0; busca vazia não lista a base', async () => {
        const marca = randomUUID().slice(0, 8);
        const u = await novoUsuario(`semaparelho-${marca}@teste.com`);
        const { body } = await http()
          .get(`/push/recipients?q=semaparelho-${marca}`)
          .set('Authorization', admin)
          .expect(200);
        expect(body).toEqual([
          expect.objectContaining({ id: u.id, devices: 0 }),
        ]);

        await http()
          .get('/push/recipients?q=%20%20')
          .set('Authorization', admin)
          .expect(200, []);
      });

      it('⚠️ quem apagou a conta não aparece', async () => {
        const marca = randomUUID().slice(0, 8);
        const u = await novoUsuario(`apagado-${marca}@teste.com`);
        await dataSource
          .getRepository(User)
          .update({ id: u.id }, { deletedAt: new Date() });
        await http()
          .get(`/push/recipients?q=apagado-${marca}`)
          .set('Authorization', admin)
          .expect(200, []);
      });
    });

    it('⚠️ preview devolve os mesmos números que o envio efetivo', async () => {
      const role = await novaRole();
      const [x, y] = await Promise.all([novoUsuario(), novoUsuario()]);
      x.role = role;
      y.role = role;
      await Promise.all([userRepository.update(x), userRepository.update(y)]);
      await Promise.all([
        novoAparelho(x.id),
        novoAparelho(x.id),
        novoAparelho(y.id),
      ]);
      const audience = { type: 'roles', roleIds: [role.id] };

      const preview = await http()
        .post('/push/audience/preview')
        .set('Authorization', admin)
        .send({ audience })
        .expect(200);
      const envio = await http()
        .post('/push/send')
        .set('Authorization', admin)
        .send(corpo(audience))
        .expect(202);

      expect(preview.body).toEqual({ targetUsers: 2, targetDevices: 3 });
      expect(envio.body).toMatchObject({
        targetUsers: 2,
        targetDevices: 3,
        status: 'sending',
      });
    });

    it('envio → 202, termina em done com contadores, e entra no audit-log', async () => {
      const email = `push-${randomUUID()}@teste.com`;
      const u = await novoUsuario(email);
      const vivo = await novoAparelho(u.id);
      const morto = await novoAparelho(u.id);
      respostaDoFcm.set(
        morto.token,
        'messaging/registration-token-not-registered',
      );

      const { body } = await http()
        .post('/push/send')
        .set('Authorization', admin)
        .send(corpo({ type: 'emails', emails: [email] }))
        .expect(202);
      const final = await esperarTerminar(body.id);

      expect(final).toMatchObject({
        status: 'done',
        targetDevices: 2,
        successCount: 1,
        failureCount: 1,
        audience: { type: 'emails', emails: [email] },
        sentBy: { id: adminId },
      });
      expect(final.finishedAt).not.toBeNull();
      expect(await tokensDe({ type: 'users', userIds: [u.id] })).toEqual([
        vivo.token,
      ]);

      const auditoria = await dataSource
        .getRepository(AuditLog)
        .findOneBy({ entityId: body.id });
      expect(auditoria).toMatchObject({
        entityType: 'push_notification',
        updatedBy: adminId,
      });
    });

    it('⚠️ público sem aparelho → 422 e NADA vai para o histórico', async () => {
      const antes = await dataSource.getRepository(PushNotification).count();

      const r = await http()
        .post('/push/send')
        .set('Authorization', admin)
        .send(corpo({ type: 'emails', emails: ['ninguem@teste.com'] }))
        .expect(422);

      expect(r.body.message).toMatch(/Ninguém nesse público/);
      expect(await dataSource.getRepository(PushNotification).count()).toBe(
        antes,
      );
      expect(sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('validação → 400: público fora do MVP, lista vazia, título longo, link externo', async () => {
      const casos = [
        corpo({ type: 'users', userIds: [adminId] }),
        corpo({ type: 'roles', roleIds: [] }),
        corpo({ type: 'roles' }),
        corpo({ type: 'emails', emails: [] }),
        corpo({ type: 'all' }, { title: 'x'.repeat(101) }),
        corpo({ type: 'all' }, { body: '' }),
      ];
      for (const c of casos) {
        await http()
          .post('/push/send')
          .set('Authorization', admin)
          .send(c)
          .expect(400);
      }
      const u = await novoUsuario();
      await novoAparelho(u.id);
      await http()
        .post('/push/send')
        .set('Authorization', admin)
        .send(corpo({ type: 'all' }, { url: 'https://golpe.example' }))
        .expect(400);
    });

    it('público "all" guardado sem campos que não são dele', async () => {
      const u = await novoUsuario();
      await novoAparelho(u.id);
      const { body } = await http()
        .post('/push/send')
        .set('Authorization', admin)
        .send(corpo({ type: 'all', roleIds: [randomUUID()] }))
        .expect(202);
      const final = await esperarTerminar(body.id);
      expect(final.audience).toEqual({ type: 'all' });
    });

    it('histórico paginado, do mais novo ao mais antigo, com autor sem dados pessoais', async () => {
      const repo = dataSource.getRepository(PushNotification);
      await repo.clear();
      const base = Date.now();
      for (let i = 0; i < 3; i++) {
        await repo.save(
          Object.assign(new PushNotification(), {
            title: `Envio ${i}`,
            body: 'b',
            audience: { type: 'all' },
            sentById: adminId,
            createdAt: new Date(base - (3 - i) * 60_000),
          }),
        );
      }

      const { body } = await http()
        .get('/push/notifications?page=1&limit=2')
        .set('Authorization', admin)
        .expect(200);

      expect(body).toMatchObject({ page: 1, limit: 2, totalItems: 3 });
      expect(body.data.map((e) => e.title)).toEqual(['Envio 2', 'Envio 1']);
      expect(Object.keys(body.data[0].sentBy).sort()).toEqual(['id', 'name']);
    });

    it('detalhe: id inexistente → 404; id inválido → 400', async () => {
      await http()
        .get(`/push/notifications/${randomUUID()}`)
        .set('Authorization', admin)
        .expect(404);
      await http()
        .get('/push/notifications/nao-e-uuid')
        .set('Authorization', admin)
        .expect(400);
    });
  });
});
