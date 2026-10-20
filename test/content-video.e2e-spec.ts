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

/** tickets/049: conteúdo em vídeo — envio pela demanda e proposta por link. */
describe('Conteúdos em vídeo (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
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
    dataSource = moduleFixture.get(DataSource);
    jwt = moduleFixture.get(JwtService);
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
    // O ms não está no ar: o que se mede é o que passa do guard e do pipe.
    const svc = moduleFixture.get(ContentProxyService);
    for (const m of ['sendVideo', 'uploadProposal']) {
      proxy[m] = jest.spyOn(svc, m as never).mockResolvedValue({} as never);
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const comPapel = async (permissoes: Partial<Role>) => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `v02-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    u.role = await dataSource
      .getRepository(Role)
      .save({ name: `v02-${randomUUID().slice(0, 8)}`, ...permissoes });
    await userRepository.update(u);
    return `Bearer ${await jwt.signAsync({ user: { id: u.id } })}`;
  };

  beforeEach(() => Object.values(proxy).forEach((s) => s.mockClear()));

  describe('POST /content/:id/video', () => {
    const enviar = async (
      body: object,
      permissoes: Partial<Role> = { uploadDemanda: true },
    ) =>
      request(app.getHttpServer())
        .post('/content/c1/video')
        .set('Authorization', await comPapel(permissoes))
        .send(body);

    it('sem permissão de upload → 403', async () => {
      const res = await enviar(
        { url: 'https://youtu.be/dQw4w9WgXcQ' },
        { validarDemanda: true },
      );
      expect(res.status).toBe(403);
      expect(proxy.sendVideo).not.toHaveBeenCalled();
    });

    it('sem url → 400; url vazia → 400', async () => {
      expect((await enviar({})).status).toBe(400);
      expect((await enviar({ url: '' })).status).toBe(400);
      expect(proxy.sendVideo).not.toHaveBeenCalled();
    });

    it('url válida → 201 e o serviço recebe id, usuário e url', async () => {
      const res = await enviar({ url: 'https://youtu.be/dQw4w9WgXcQ' });
      expect(res.status).toBe(201);
      expect(proxy.sendVideo.mock.calls[0][0]).toBe('c1');
      expect(proxy.sendVideo.mock.calls[0][2]).toBe(
        'https://youtu.be/dQw4w9WgXcQ',
      );
    });
  });

  describe('POST /content/:id/proposal com url (049/03)', () => {
    it('só url no FormData → 201; serviço recebe url, comentário e nenhum arquivo', async () => {
      const res = await request(app.getHttpServer())
        .post('/content/c1/proposal')
        .set('Authorization', await comPapel({ uploadDemanda: true }))
        .field('url', 'https://youtu.be/dQw4w9WgXcQ')
        .field('comment', 'troca');
      expect(res.status).toBe(201);
      const [id, , file, comment, url] = proxy.uploadProposal.mock.calls[0];
      expect(id).toBe('c1');
      expect(file).toBeUndefined();
      expect(comment).toBe('troca');
      expect(url).toBe('https://youtu.be/dQw4w9WgXcQ');
    });

    it('arquivo .docx sem url continua chegando como arquivo, com url undefined', async () => {
      const res = await request(app.getHttpServer())
        .post('/content/c1/proposal')
        .set('Authorization', await comPapel({ uploadDemanda: true }))
        .attach('file', Buffer.from('PK'), {
          filename: 'a.docx',
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      expect(res.status).toBe(201);
      const [, , file, , url] = proxy.uploadProposal.mock.calls[0];
      expect(file.originalname).toBe('a.docx');
      expect(url).toBeUndefined();
    });
  });
});
