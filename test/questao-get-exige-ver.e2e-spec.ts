import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { Role } from 'src/modules/role/role.entity';
import { QuestaoService } from 'src/modules/simulado/questao/questao.service';
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
 * tickets/023, card 16: `GET mssimulado/questoes/:id` estava sem guard — lia
 * a questão inteira, com gabarito, sem login.
 */
describe('GET mssimulado/questoes/:id exige ver o banco (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwt: JwtService;
  let userService: UserService;
  let userRepository: UserRepository;
  let getById: jest.SpyInstance;
  let sinalizar: jest.SpyInstance;

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
    // O ms não está no ar nos testes: o que se mede é quem passa pelo guard.
    getById = jest
      .spyOn(moduleFixture.get(QuestaoService), 'getById')
      .mockResolvedValue({ _id: 'q1' } as never);
    sinalizar = jest
      .spyOn(moduleFixture.get(QuestaoService), 'sinalizarRevisao')
      .mockResolvedValue(undefined as never);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const comPapel = async (permissoes: Partial<Role>) => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `q16-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    u.role = await dataSource
      .getRepository(Role)
      .save({ name: `q16-${randomUUID().slice(0, 8)}`, ...permissoes });
    await userRepository.update(u);
    return `Bearer ${await jwt.signAsync({ user: { id: u.id } })}`;
  };
  const ler = () => request(app.getHttpServer()).get('/mssimulado/questoes/q1');

  beforeEach(() => getById.mockClear());

  it('sem token → 403, e nada é pedido ao ms', async () => {
    await ler().expect(403);
    expect(getById).not.toHaveBeenCalled();
  });

  it('logado sem permissão de ver → 403', async () => {
    await ler()
      .set('Authorization', await comPapel({ gerenciarEstudantes: true }))
      .expect(403);
    expect(getById).not.toHaveBeenCalled();
  });

  it.each([
    ['visualizarQuestao', { visualizarQuestao: true }],
    ['visualizarQuestoesCursinho', { visualizarQuestoesCursinho: true }],
    ['editarQuestoesCursinho', { editarQuestoesCursinho: true }],
  ])('com %s → 200, com o ator', async (_n, permissao) => {
    await ler()
      .set('Authorization', await comPapel(permissao))
      .expect(200);
    expect(getById.mock.calls[0][0]).toBe('q1');
    expect(getById.mock.calls[0][1]).toMatchObject({ admin: false });
  });

  describe('POST :id/revisao (024 · 04)', () => {
    const sinalizarRota = () =>
      request(app.getHttpServer()).post('/mssimulado/questoes/q1/revisao');

    beforeEach(() => sinalizar.mockClear());

    it('validador do cursinho com motivo → 201, com o ator', async () => {
      await sinalizarRota()
        .set('Authorization', await comPapel({ validarQuestoesCursinho: true }))
        .send({ motivo: 'Gabarito errado na C' })
        .expect(201);
      expect(sinalizar.mock.calls[0][1]).toBe('Gabarito errado na C');
      expect(sinalizar.mock.calls[0][2]).toMatchObject({
        validadorCursinho: true,
      });
    });

    it('motivo curto → 400 e o ms nem é chamado', async () => {
      await sinalizarRota()
        .set('Authorization', await comPapel({ validarQuestoesCursinho: true }))
        .send({ motivo: 'ruim' })
        .expect(400);
      expect(sinalizar).not.toHaveBeenCalled();
    });

    it('só ver o banco → 403', async () => {
      await sinalizarRota()
        .set(
          'Authorization',
          await comPapel({ visualizarQuestoesCursinho: true }),
        )
        .send({ motivo: 'Gabarito errado na C' })
        .expect(403);
    });
  });
});
