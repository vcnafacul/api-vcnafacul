import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { GeoConfirmation } from 'src/modules/geo/confirmation/geo-confirmation.entity';
import { TypeGeo } from 'src/modules/geo/enum/typeGeo';
import { Geolocation } from 'src/modules/geo/geo.entity';
import { GeoService } from 'src/modules/geo/geo.service';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/**
 * "Informação correta" (tickets/022, card 03), com MySQL real. Validade =
 * confirmada DEPOIS da última edição de conteúdo do cursinho.
 */
describe('Confirmação de informação do cursinho (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwt: JwtService;
  let geoService: GeoService;
  let userService: UserService;
  let userRepository: UserRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = createNestAppTest(moduleFixture);
    await app.init();
    dataSource = moduleFixture.get(DataSource);
    jwt = moduleFixture.get(JwtService);
    geoService = moduleFixture.get(GeoService);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM geo_confirmations');
    await dataSource.query('DELETE FROM log_geo');
    await dataSource.query('DELETE FROM geolocations');
    await (geoService as any).invalidarPublico();
  });

  const http = () => request(app.getHttpServer());
  const bearer = async (id: string) =>
    `Bearer ${await jwt.signAsync({ user: { id } }, { expiresIn: '1h' })}`;

  const novoUsuario = async () => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `conf-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    return { ...u, auth: await bearer(u.id) };
  };

  const novoGeo = (campos: Partial<Geolocation> = {}) =>
    dataSource.getRepository(Geolocation).save(
      Object.assign(new Geolocation(), {
        name: `Cursinho ${randomUUID().slice(0, 6)}`,
        latitude: -22.9,
        longitude: -47.06,
        cep: '13000-000',
        state: 'SP',
        city: 'Campinas',
        neighborhood: 'Centro',
        street: 'Rua A',
        userFullName: 'Quem Cadastrou',
        userPhone: '1',
        userConnection: 'x',
        userEmail: 'q@x.com',
        status: Status.Approved,
        type: TypeGeo.PREP_COURSE,
        ...campos,
      }),
    );

  const contagemPublica = async (geoId: string) => {
    const { body } = await http().get('/geo/public').expect(200);
    return body.find((g) => g.id === geoId)?.confirmations;
  };
  const confirmar = (geoId: string, auth: string) =>
    http().post(`/geo/${geoId}/confirmation`).set('Authorization', auth);
  const minhas = async (auth: string) =>
    (
      await http()
        .get('/geo/confirmation/me')
        .set('Authorization', auth)
        .expect(200)
    ).body;

  it('confirmar duas vezes → 1 registro; aparece no /geo/public e no "me"', async () => {
    const geo = await novoGeo();
    const u = await novoUsuario();
    expect(await contagemPublica(geo.id)).toBe(0); // popula o cache

    await confirmar(geo.id, u.auth).expect(200);
    await confirmar(geo.id, u.auth).expect(200);

    expect(await dataSource.getRepository(GeoConfirmation).count()).toBe(1);
    expect(await contagemPublica(geo.id)).toBe(1); // cache invalidado
    expect(await minhas(u.auth)).toEqual([geo.id]);
  });

  it('conta uma por pessoa', async () => {
    const geo = await novoGeo();
    const [a, b] = await Promise.all([novoUsuario(), novoUsuario()]);
    await confirmar(geo.id, a.auth).expect(200);
    await confirmar(geo.id, b.auth).expect(200);
    expect(await contagemPublica(geo.id)).toBe(2);
  });

  it('sem token → 401 (confirmar, desfazer e "me")', async () => {
    const geo = await novoGeo();
    await http().post(`/geo/${geo.id}/confirmation`).expect(401);
    await http().delete(`/geo/${geo.id}/confirmation`).expect(401);
    await http().get('/geo/confirmation/me').expect(401);
  });

  it('pendente, rejeitado ou inexistente → 404; id inválido → 400', async () => {
    const u = await novoUsuario();
    const pendente = await novoGeo({ status: Status.Pending });
    const rejeitado = await novoGeo({ status: Status.Rejected });
    await confirmar(pendente.id, u.auth).expect(404);
    await confirmar(rejeitado.id, u.auth).expect(404);
    await confirmar(randomUUID(), u.auth).expect(404);
    await confirmar('nao-e-uuid', u.auth).expect(400);
    expect(await dataSource.getRepository(GeoConfirmation).count()).toBe(0);
  });

  it('desfazer remove, e o contador volta', async () => {
    const geo = await novoGeo();
    const u = await novoUsuario();
    await confirmar(geo.id, u.auth).expect(200);
    await http()
      .delete(`/geo/${geo.id}/confirmation`)
      .set('Authorization', u.auth)
      .expect(204);
    expect(await contagemPublica(geo.id)).toBe(0);
    expect(await minhas(u.auth)).toEqual([]);
  });

  it('⚠️ editar o endereço invalida: contador 0 e o "me" não traz mais; reconfirmar volta a valer', async () => {
    const geo = await novoGeo();
    const u = await novoUsuario();
    const editor = await novoUsuario();
    await confirmar(geo.id, u.auth).expect(200);

    await geoService.updateGeo(
      { id: geo.id, street: 'Rua Nova' } as any,
      editor as any,
    );

    expect(await contagemPublica(geo.id)).toBe(0);
    expect(await minhas(u.auth)).toEqual([]);
    const { body } = await http().get('/geo/public').expect(200);
    expect(body.find((g) => g.id === geo.id).infoUpdatedAt).not.toBeNull();

    // Logo em seguida (mesmo segundo): tem de valer — por isso datetime(3).
    await confirmar(geo.id, u.auth).expect(200);
    expect(await contagemPublica(geo.id)).toBe(1);
  });

  it('⚠️ report NÃO zera as confirmações', async () => {
    const geo = await novoGeo();
    const u = await novoUsuario();
    await confirmar(geo.id, u.auth).expect(200);

    await http()
      .post('/geo/report-map-home')
      .send({ entityId: geo.id, message: 'x', address: true })
      .expect((r) => expect(r.status).toBeLessThan(300));

    expect(await contagemPublica(geo.id)).toBe(1);
  });

  it('editar só dados de quem cadastrou NÃO invalida (não é conteúdo público)', async () => {
    const geo = await novoGeo();
    const u = await novoUsuario();
    await confirmar(geo.id, u.auth).expect(200);
    await geoService.updateGeo(
      { id: geo.id, userPhone: '99' } as any,
      u as any,
    );
    expect(await contagemPublica(geo.id)).toBe(1);
  });

  it('usuário que apagou a conta não conta', async () => {
    const geo = await novoGeo();
    const u = await novoUsuario();
    await confirmar(geo.id, u.auth).expect(200);
    await dataSource.query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [
      u.id,
    ]);
    await (geoService as any).invalidarPublico();
    expect(await contagemPublica(geo.id)).toBe(0);
  });

  it('apagar o cursinho apaga as confirmações (cascade)', async () => {
    const geo = await novoGeo();
    const u = await novoUsuario();
    await confirmar(geo.id, u.auth).expect(200);
    await dataSource.query('DELETE FROM geolocations WHERE id = ?', [geo.id]);
    expect(await dataSource.getRepository(GeoConfirmation).count()).toBe(0);
  });
});
