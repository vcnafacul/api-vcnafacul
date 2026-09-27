import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash, randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { PushDevice } from 'src/modules/push/push-device.entity';
import { PushDeviceRepository } from 'src/modules/push/push-device.repository';
import {
  PushNotification,
  StatusDoEnvio,
} from 'src/modules/push/push-notification.entity';
import { PushService } from 'src/modules/push/push.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { RoleService } from 'src/modules/role/role.service';
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
        k === 'PUSH_ENABLED' ? true : getOriginal(k),
      );

    push = moduleFixture.get(PushService);
    devices = moduleFixture.get(PushDeviceRepository);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
    roleService = moduleFixture.get(RoleService);
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    sendEachForMulticast.mockClear();
    respostaDoFcm.clear();
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
});
