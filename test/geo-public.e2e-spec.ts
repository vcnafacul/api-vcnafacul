import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { CAMPOS_PUBLICOS_GEO } from 'src/modules/geo/dto/public-geo.dto.output';
import { TypeGeo } from 'src/modules/geo/enum/typeGeo';
import { Geolocation } from 'src/modules/geo/geo.entity';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeo } from 'src/modules/geo/log-geo/log-geo.entity';
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
 * `GET /geo/public` (tickets/022, card 01). O `GET /geo` devolvia a entidade
 * inteira, com dados pessoais de quem cadastrou e de quem validou, e aceitava
 * `status` da query — listava pendentes e rejeitados.
 */
describe('GET /geo/public (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
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
    geoService = moduleFixture.get(GeoService);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM log_geo');
    await dataSource.query('DELETE FROM geolocations');
    // O cache é em memória nos testes: esvazia entre um teste e outro.
    await (geoService as any).invalidarPublico();
  });

  const http = () => request(app.getHttpServer());

  const novoGeo = async (campos: Partial<Geolocation> = {}) => {
    const geo = Object.assign(new Geolocation(), {
      name: `Cursinho ${randomUUID().slice(0, 8)}`,
      latitude: -22.9,
      longitude: -47.06,
      cep: '13000-000',
      state: 'SP',
      city: 'Campinas',
      neighborhood: 'Centro',
      street: 'Rua A',
      userFullName: 'Pessoa Que Cadastrou',
      userPhone: '11999990000',
      userConnection: 'Coordenadora',
      userEmail: 'quem.cadastrou@exemplo.com',
      status: Status.Approved,
      type: TypeGeo.PREP_COURSE,
      ...campos,
    });
    return dataSource.getRepository(Geolocation).save(geo);
  };

  const novoUsuario = async () => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `geo-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    return userRepository.findOneBy({ email: dto.email });
  };

  it('sem token → 200, só aprovados, mesmo com ?status=0', async () => {
    const aprovado = await novoGeo();
    await novoGeo({ status: Status.Pending });
    await novoGeo({ status: Status.Rejected });

    const { body } = await http().get('/geo/public?status=0').expect(200);

    expect(body.map((g) => g.id)).toEqual([aprovado.id]);
  });

  it('⚠️ as chaves são EXATAMENTE a lista branca (sem user*, logs, report*, status)', async () => {
    const geo = await novoGeo({ reportAddress: true });
    await dataSource.getRepository(LogGeo).save(
      Object.assign(new LogGeo(), {
        geoId: geo.id,
        status: 0,
        description: 'x',
      }),
    );

    const { body } = await http().get('/geo/public').expect(200);

    // Se alguém acrescentar coluna na entidade, este teste obriga a decidir se
    // ela é pública (e entra na lista branca) ou não.
    expect(Object.keys(body[0]).sort()).toEqual(
      [...CAMPOS_PUBLICOS_GEO].sort(),
    );
    const texto = JSON.stringify(body);
    expect(texto).not.toContain('quem.cadastrou@exemplo.com');
    expect(texto).not.toContain('11999990000');
    expect(texto).not.toContain('Pessoa Que Cadastrou');
  });

  it('filtra por tipo', async () => {
    const cursinho = await novoGeo({ type: TypeGeo.PREP_COURSE });
    const universidade = await novoGeo({ type: TypeGeo.COLLEGE });

    const soCursinhos = await http()
      .get(`/geo/public?type=${TypeGeo.PREP_COURSE}`)
      .expect(200);
    const soUniversidades = await http()
      .get(`/geo/public?type=${TypeGeo.COLLEGE}`)
      .expect(200);
    const todos = await http().get('/geo/public').expect(200);

    expect(soCursinhos.body.map((g) => g.id)).toEqual([cursinho.id]);
    expect(soUniversidades.body.map((g) => g.id)).toEqual([universidade.id]);
    expect(todos.body).toHaveLength(2);
  });

  it('type inválido → 400', async () => {
    await http().get('/geo/public?type=9').expect(400);
  });

  it('⚠️ aprovar um pendente aparece na hora (o cache é invalidado)', async () => {
    const pendente = await novoGeo({ status: Status.Pending });
    const antes = await http().get('/geo/public').expect(200); // popula o cache
    expect(antes.body).toHaveLength(0);

    await geoService.validateGeolocation(
      { geoId: pendente.id, status: Status.Approved } as any,
      await novoUsuario(),
    );

    const depois = await http().get('/geo/public').expect(200);
    expect(depois.body.map((g) => g.id)).toEqual([pendente.id]);
  });

  it('⚠️ editar um aprovado aparece na hora (o cache é invalidado)', async () => {
    const geo = await novoGeo({ name: 'Nome Antigo' });
    await http().get('/geo/public').expect(200); // popula o cache

    await geoService.updateGeo(
      { id: geo.id, name: 'Nome Novo' } as any,
      await novoUsuario(),
    );

    const { body } = await http().get('/geo/public').expect(200);
    expect(body[0].name).toBe('Nome Novo');
  });

  it('o GET /geo (dash) continua como estava — fechá-lo é o card 01b', async () => {
    await novoGeo();
    await http().get('/geo?page=1&limit=10&status=1').expect(200);
  });
});
