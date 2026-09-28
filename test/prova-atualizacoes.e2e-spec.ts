import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { Role } from 'src/modules/role/role.entity';
import { ProvaService } from 'src/modules/simulado/prova/prova.service';
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
 * tickets/023, cards 13 e 14 — as rotas de atualização da prova na api: quem
 * entra, e o corpo do "aplicar" validado antes de ir ao ms.
 */
describe('mssimulado/prova/:id/atualizacoes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwt: JwtService;
  let userService: UserService;
  let userRepository: UserRepository;
  let listar: jest.SpyInstance;
  let aplicar: jest.SpyInstance;

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
    // O ms não está no ar nos testes.
    const prova = moduleFixture.get(ProvaService);
    listar = jest
      .spyOn(prova, 'listarAtualizacoes')
      .mockResolvedValue({ podeComporProva: true, atualizacoes: [] } as never);
    aplicar = jest
      .spyOn(prova, 'aplicarAtualizacoes')
      .mockResolvedValue({ trocadas: 1 } as never);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    listar.mockClear();
    aplicar.mockClear();
  });

  const comPapel = async (permissoes: Partial<Role>) => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `pa-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    u.role = await dataSource
      .getRepository(Role)
      .save({ name: `pa-${randomUUID().slice(0, 8)}`, ...permissoes });
    await userRepository.update(u);
    return `Bearer ${await jwt.signAsync({ user: { id: u.id } })}`;
  };
  const ID = '665f0c1a2b3c4d5e6f00abc1';
  const OUTRO = '665f0c1a2b3c4d5e6f00abc2';

  it('listar: quem vê as provas do cursinho → 200; sem permissão → 403', async () => {
    await request(app.getHttpServer())
      .get(`/mssimulado/prova/${ID}/atualizacoes`)
      .set('Authorization', await comPapel({ visualizarProvasCursinho: true }))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/mssimulado/prova/${ID}/atualizacoes`)
      .set('Authorization', await comPapel({ gerenciarEstudantes: true }))
      .expect(403);
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('aplicar: só ver não basta → 403', async () => {
    await request(app.getHttpServer())
      .post(`/mssimulado/prova/${ID}/atualizacoes`)
      .set('Authorization', await comPapel({ visualizarProvasCursinho: true }))
      .send({ trocas: [{ de: ID, para: OUTRO }] })
      .expect(403);
    expect(aplicar).not.toHaveBeenCalled();
  });

  it.each([
    ['sem trocas', { trocas: [] }],
    ['id inválido', { trocas: [{ de: 'x', para: OUTRO }] }],
    ['sem o corpo', {}],
  ])(
    'aplicar com corpo inválido (%s) → 400, e o ms nem é chamado',
    async (_n, corpo) => {
      await request(app.getHttpServer())
        .post(`/mssimulado/prova/${ID}/atualizacoes`)
        .set('Authorization', await comPapel({ editarQuestoesCursinho: true }))
        .send(corpo)
        .expect(400);
      expect(aplicar).not.toHaveBeenCalled();
    },
  );

  it('aplicar válido com o editor → repassa as trocas e o ator', async () => {
    await request(app.getHttpServer())
      .post(`/mssimulado/prova/${ID}/atualizacoes`)
      .set('Authorization', await comPapel({ editarQuestoesCursinho: true }))
      .send({ trocas: [{ de: ID, para: OUTRO }] })
      .expect(201);
    expect(aplicar.mock.calls[0][0]).toBe(ID);
    expect(aplicar.mock.calls[0][1]).toEqual([{ de: ID, para: OUTRO }]);
    expect(aplicar.mock.calls[0][2]).toMatchObject({ editorCursinho: true });
  });
});
