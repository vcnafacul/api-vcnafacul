import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { Role } from 'src/modules/role/role.entity';
import { ContentProxyService } from 'src/modules/simulado/content/content.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/** tickets/050, card 02: a linha do tempo da demanda exige ver demandas. */
describe('GET /content/:id/timeline (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwt: JwtService;
  let userService: UserService;
  let userRepository: UserRepository;
  let getTimeline: jest.SpyInstance;

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
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
    getTimeline = jest
      .spyOn(moduleFixture.get(ContentProxyService), 'getTimeline')
      .mockResolvedValue({ eventos: [] } as never);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const comPapel = async (permissoes: Partial<Role>) => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `t02-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    u.role = await dataSource
      .getRepository(Role)
      .save({ name: `t02-${randomUUID().slice(0, 8)}`, ...permissoes });
    await userRepository.update(u);
    return `Bearer ${await jwt.signAsync({ user: { id: u.id } })}`;
  };
  const ler = () => request(app.getHttpServer()).get('/content/c1/timeline');

  beforeEach(() => getTimeline.mockClear());

  it('sem token → 403 do guard de permissão, sem chamar o serviço', async () => {
    const res = await ler();
    expect([401, 403]).toContain(res.status);
    expect(getTimeline).not.toHaveBeenCalled();
  });

  it('logado sem visualizarDemanda → 403', async () => {
    await ler()
      .set('Authorization', await comPapel({ uploadDemanda: true }))
      .expect(403);
    expect(getTimeline).not.toHaveBeenCalled();
  });

  it('com visualizarDemanda → 200 { eventos }', async () => {
    const res = await ler()
      .set('Authorization', await comPapel({ visualizarDemanda: true }))
      .expect(200);
    expect(res.body).toEqual({ eventos: [] });
    expect(getTimeline).toHaveBeenCalledWith('c1');
  });
});
