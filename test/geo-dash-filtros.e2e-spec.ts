import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { TypeGeo } from 'src/modules/geo/enum/typeGeo';
import { Geolocation } from 'src/modules/geo/geo.entity';
import { Role } from 'src/modules/role/role.entity';
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

/** Os filtros do dash do Localiza (`GET /geo`). */
describe('GET /geo — filtros do dash (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let auth: string;

  // Marca única desta execução: as buscas só olham para os próprios registros.
  const marca = randomUUID().slice(0, 8);
  const criados: string[] = [];

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

    const userService = moduleFixture.get(UserService);
    const userRepository = moduleFixture.get(UserRepository);
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `geo-filtro-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    u.role = await dataSource
      .getRepository(Role)
      .save({ name: `geo-${marca}`, validarCursinho: true });
    await userRepository.update(u);
    auth = `Bearer ${await moduleFixture
      .get(JwtService)
      .signAsync({ user: { id: u.id } })}`;

    const novo = (campos: Partial<Geolocation>) =>
      dataSource.getRepository(Geolocation).save(
        Object.assign(new Geolocation(), {
          latitude: -22.9,
          longitude: -47.06,
          cep: '13000-000',
          state: 'SP',
          city: 'Campinas',
          neighborhood: 'Centro',
          street: 'Rua A',
          userFullName: 'Quem Cadastrou',
          userPhone: '11999990000',
          userConnection: 'Coordenadora',
          userEmail: `cadastro-${marca}@exemplo.com`,
          status: Status.Pending,
          type: TypeGeo.PREP_COURSE,
          category: 'Gratuito',
          ...campos,
        }),
      );
    const geos = await Promise.all([
      novo({ name: `${marca} Alfa`, email: `alfa-${marca}@x.com` }),
      novo({
        name: `${marca} Beta`,
        state: 'RJ',
        city: 'Niterói',
        category: 'Sem fins lucrativos',
        reportAddress: true,
      }),
      novo({
        name: `${marca} Gama`,
        status: Status.Approved,
        reportOther: true,
      }),
      novo({
        name: `${marca} Delta`,
        type: TypeGeo.COLLEGE,
        alias: `UNI${marca}`,
        status: Status.Rejected,
        reportContact: true,
      }),
    ]);
    criados.push(...geos.map((g) => g.id));
  });

  afterAll(async () => {
    if (criados.length) {
      await dataSource.query('DELETE FROM geolocations WHERE id IN (?)', [
        criados,
      ]);
    }
    if (app) await app.close();
  });

  const nomes = async (query: Record<string, string | number>) => {
    const { body } = await request(app.getHttpServer())
      .get('/geo')
      .query({ page: 1, limit: 100, text: marca, ...query })
      .set('Authorization', auth)
      .expect(200);
    return body.data
      .map((g: Geolocation) => g.name.replace(`${marca} `, ''))
      .sort();
  };

  it('sem status continua trazendo só os pendentes', async () => {
    expect(await nomes({})).toEqual(['Alfa', 'Beta']);
  });

  it('status=-1 traz todos os status', async () => {
    expect(await nomes({ status: -1 })).toEqual([
      'Alfa',
      'Beta',
      'Delta',
      'Gama',
    ]);
  });

  it('busca pela sigla (universidade)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/geo')
      .query({ status: -1, text: `uni${marca}` })
      .set('Authorization', auth)
      .expect(200);
    expect(body.data.map((g: Geolocation) => g.id)).toEqual([criados[3]]);
  });

  it('tipo, UF, cidade e tipo de cursinho', async () => {
    expect(await nomes({ status: -1, type: TypeGeo.COLLEGE })).toEqual([
      'Delta',
    ]);
    expect(await nomes({ status: -1, state: 'RJ' })).toEqual(['Beta']);
    expect(await nomes({ status: -1, city: 'niter' })).toEqual(['Beta']);
    expect(await nomes({ status: -1, category: 'Gratuito' })).toEqual([
      'Alfa',
      'Delta',
      'Gama',
    ]);
  });

  it('e-mail do cursinho ou de quem cadastrou', async () => {
    expect(await nomes({ status: -1, email: `alfa-${marca}` })).toEqual([
      'Alfa',
    ]);
    expect(await nomes({ status: 0, email: `cadastro-${marca}` })).toEqual([
      'Alfa',
      'Beta',
    ]);
  });

  it('revisões: basta qualquer uma das marcadas', async () => {
    expect(await nomes({ status: -1, revisoes: 'reportAddress' })).toEqual([
      'Beta',
    ]);
    expect(
      await nomes({ status: -1, revisoes: 'reportAddress,reportOther' }),
    ).toEqual(['Beta', 'Gama']);
  });

  it('filtros somam entre si', async () => {
    expect(
      await nomes({
        status: -1,
        revisoes: 'reportContact,reportOther',
        type: 0,
      }),
    ).toEqual(['Gama']);
  });

  it('valores inválidos → 400', async () => {
    const http = () =>
      request(app.getHttpServer()).get('/geo').set('Authorization', auth);
    await http().query({ status: 7 }).expect(400);
    await http().query({ revisoes: 'deletedAt' }).expect(400);
  });
});
