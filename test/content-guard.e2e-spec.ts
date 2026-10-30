import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { ContentProxyService } from 'src/modules/simulado/content/content.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/**
 * tickets/048, card 04: `GET /content/file/:id` e as três estatísticas
 * estavam sem guard nenhum (o único global é o throttler). O id do arquivo
 * aparece para qualquer logado em `/content/order`; o link baixava sem login.
 */
describe('Conteúdos: arquivo e estatísticas exigem login (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let userService: UserService;
  let userRepository: UserRepository;
  const proxy: Record<string, jest.SpyInstance> = {};

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
    jwt = moduleFixture.get(JwtService);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
    // O ms e o R2 não estão no ar: o que se mede é quem passa pelo guard.
    const svc = moduleFixture.get(ContentProxyService);
    proxy.getFile = jest
      .spyOn(svc, 'getFile')
      .mockResolvedValue({ buffer: 'AAAA', contentType: 'x' } as never);
    proxy.getSummary = jest
      .spyOn(svc, 'getSummary')
      .mockResolvedValue({} as never);
    proxy.getStatsByFrente = jest
      .spyOn(svc, 'getStatsByFrente')
      .mockResolvedValue([] as never);
    proxy.getSnapshotContentStatus = jest
      .spyOn(svc, 'getSnapshotContentStatus')
      .mockResolvedValue([] as never);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  /** Aluno comum: papel padrão, nenhuma permissão de demanda. */
  const aluno = async () => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `c04-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    return `Bearer ${await jwt.signAsync({ user: { id: u.id } })}`;
  };

  const rotas: [string, string, string][] = [
    ['/content/file/abc', 'getFile', 'arquivo'],
    ['/content/stats-by-frente', 'getStatsByFrente', 'por frente'],
    ['/content/snapshot-content-status', 'getSnapshotContentStatus', 'snapshot'],
  ];

  beforeEach(() => Object.values(proxy).forEach((s) => s.mockClear()));

  it.each(rotas)('%s sem token → 401 e nada chega ao serviço (%s)', async (rota, metodo) => {
    await request(app.getHttpServer()).get(rota).expect(401);
    expect(proxy[metodo]).not.toHaveBeenCalled();
  });

  it.each(rotas)('%s com aluno logado → 200 (%s)', async (rota, metodo) => {
    await request(app.getHttpServer())
      .get(rota)
      .set('Authorization', await aluno())
      .expect(200);
    expect(proxy[metodo]).toHaveBeenCalledTimes(1);
  });

  // A home sem login mostra o total de conteúdos: com 401 aqui o client
  // entrava em laço home ↔ /logoff.
  it('/content/summary é público (a home sem login lê o total)', async () => {
    await request(app.getHttpServer()).get('/content/summary').expect(200);
    expect(proxy.getSummary).toHaveBeenCalledTimes(1);
  });

  it('o arquivo pedido é o que o aluno pediu', async () => {
    await request(app.getHttpServer())
      .get('/content/file/abc')
      .set('Authorization', await aluno())
      .expect(200);
    expect(proxy.getFile).toHaveBeenCalledWith('abc');
  });
});
