import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { Role } from 'src/modules/role/role.entity';
import { ContentProxyService } from 'src/modules/simulado/content/content.service';
import {
  MIME_DOCX,
  TAMANHO_MAXIMO_DOCX,
} from 'src/modules/simulado/content/upload-docx.options';
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
 * tickets/048, card 05: o upload de conteúdo não validava tipo nem tamanho
 * (o `accept=".docx"` era só do input do navegador), e `create`, `status`,
 * `order` e a revisão de proposta recebiam `dto: any`.
 */
describe('Conteúdos: validação de upload e DTOs (e2e)', () => {
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
    // O ms e o R2 não estão no ar: o que se mede é o que passa do pipe e do
    // multer até o serviço.
    const svc = moduleFixture.get(ContentProxyService);
    for (const m of [
      'uploadFile',
      'uploadProposal',
      'create',
      'changeStatus',
      'changeOrder',
      'reviewProposal',
    ]) {
      proxy[m] = jest.spyOn(svc, m as never).mockResolvedValue({} as never);
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const comPapel = async (permissoes: Partial<Role>) => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `c05-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    u.role = await dataSource
      .getRepository(Role)
      .save({ name: `c05-${randomUUID().slice(0, 8)}`, ...permissoes });
    await userRepository.update(u);
    return `Bearer ${await jwt.signAsync({ user: { id: u.id } })}`;
  };

  beforeEach(() => Object.values(proxy).forEach((s) => s.mockClear()));

  describe.each([
    ['/content/upload/abc', 'uploadFile'],
    ['/content/abc/proposal', 'uploadProposal'],
  ])('POST %s', (rota, metodo) => {
    const enviar = async (
      conteudo: Buffer,
      nome: string,
      mime: string,
    ) =>
      request(app.getHttpServer())
        .post(rota)
        .set('Authorization', await comPapel({ uploadDemanda: true }))
        .attach('file', conteudo, { filename: nome, contentType: mime });

    it('.pdf → 400, nada chega ao serviço', async () => {
      const res = await enviar(
        Buffer.from('%PDF-1.4'),
        'apostila.pdf',
        'application/pdf',
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/\.docx/);
      expect(proxy[metodo]).not.toHaveBeenCalled();
    });

    it('.txt renomeado para .docx (mime text/plain) → 400', async () => {
      const res = await enviar(Buffer.from('oi'), 'apostila.docx', 'text/plain');
      expect(res.status).toBe(400);
      expect(proxy[metodo]).not.toHaveBeenCalled();
    });

    it('mime de docx com extensão errada → 400', async () => {
      const res = await enviar(Buffer.from('PK'), 'apostila.doc', MIME_DOCX);
      expect(res.status).toBe(400);
      expect(proxy[metodo]).not.toHaveBeenCalled();
    });

    it('.docx acima do limite → 413', async () => {
      const res = await enviar(
        Buffer.alloc(TAMANHO_MAXIMO_DOCX + 1, 1),
        'apostila.docx',
        MIME_DOCX,
      );
      expect(res.status).toBe(413);
      expect(proxy[metodo]).not.toHaveBeenCalled();
    });

    it('.docx normal → chega ao serviço com o arquivo', async () => {
      const res = await enviar(Buffer.from('PK'), 'apostila.docx', MIME_DOCX);
      expect(res.status).toBe(201);
      expect(proxy[metodo]).toHaveBeenCalledTimes(1);
      const arquivo = proxy[metodo].mock.calls[0][2];
      expect(arquivo.originalname).toBe('apostila.docx');
    });
  });

  describe('DTOs tipados', () => {
    it('POST /content sem título → 400', async () => {
      await request(app.getHttpServer())
        .post('/content')
        .set('Authorization', await comPapel({ validarDemanda: true }))
        .send({ subjectId: 's1', description: 'd' })
        .expect(400);
      expect(proxy.create).not.toHaveBeenCalled();
    });

    it('POST /content completo → serviço recebe só os campos do DTO', async () => {
      await request(app.getHttpServer())
        .post('/content')
        .set('Authorization', await comPapel({ validarDemanda: true }))
        .send({ subjectId: 's1', title: 'Funções', description: 'd', x: 1 })
        .expect(201);
      expect(proxy.create.mock.calls[0][0]).toEqual({
        subjectId: 's1',
        title: 'Funções',
        description: 'd',
      });
    });

    it('PATCH /content/status Rejected sem motivo → 400; com motivo repassa', async () => {
      const auth = await comPapel({ validarDemanda: true });
      await request(app.getHttpServer())
        .patch('/content/status')
        .set('Authorization', auth)
        .send({ id: 'c1', status: 2 })
        .expect(400);
      await request(app.getHttpServer())
        .patch('/content/status')
        .set('Authorization', auth)
        .send({ id: 'c1', status: 2, reason: 'Faltou a bibliografia' })
        .expect(200);
      expect(proxy.changeStatus).toHaveBeenCalledTimes(1);
      expect(proxy.changeStatus.mock.calls[0][3]).toBe('Faltou a bibliografia');
    });

    it('PATCH /content/status Approved sem motivo → 200', async () => {
      await request(app.getHttpServer())
        .patch('/content/status')
        .set('Authorization', await comPapel({ validarDemanda: true }))
        .send({ id: 'c1', status: 1 })
        .expect(200);
      expect(proxy.changeStatus.mock.calls[0][3]).toBeUndefined();
    });

    it('PATCH /content/status com status fora do enum → 400', async () => {
      await request(app.getHttpServer())
        .patch('/content/status')
        .set('Authorization', await comPapel({ validarDemanda: true }))
        .send({ id: 'c1', status: 9 })
        .expect(400);
    });

    it('PATCH /content/order sem lista → 400; com lista repassa', async () => {
      const auth = await comPapel({ gerenciadorDemanda: true });
      await request(app.getHttpServer())
        .patch('/content/order')
        .set('Authorization', auth)
        .send({ orderedIds: [] })
        .expect(400);
      await request(app.getHttpServer())
        .patch('/content/order')
        .set('Authorization', auth)
        .send({ orderedIds: ['a', 'b'] })
        .expect(200);
      expect(proxy.changeOrder.mock.calls[0][0]).toEqual({
        orderedIds: ['a', 'b'],
      });
    });

    it('PATCH /content/proposal/:id/review só aceita 1 ou 2', async () => {
      const auth = await comPapel({ validarDemanda: true });
      await request(app.getHttpServer())
        .patch('/content/proposal/p1/review')
        .set('Authorization', auth)
        .send({ status: 0 })
        .expect(400);
      await request(app.getHttpServer())
        .patch('/content/proposal/p1/review')
        .set('Authorization', auth)
        .send({ status: 1 })
        .expect(200);
      expect(proxy.reviewProposal.mock.calls[0][1]).toBe(1);
    });
  });
});
