import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { News } from 'src/modules/news/news.entity';
import { User } from 'src/modules/user/user.entity';
import { Gender } from 'src/modules/user/enum/gender';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

describe('News destaque mutex (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fakeUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { id: fakeUserId };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { id: fakeUserId };
          return true;
        },
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    const blobService = moduleFixture.get<any>('BlobService');
    let counter = 0;
    jest
      .spyOn(blobService, 'uploadFile')
      .mockImplementation(async () => `news-fake-key-${++counter}`);
    jest
      .spyOn(blobService, 'getFile')
      .mockImplementation(async () => ({
        buffer: '',
        contentType: 'application/octet-stream',
      }));
    jest.spyOn(blobService, 'deleteFile').mockImplementation(async () => {});

    await app.init();

    const userRepo = dataSource.getRepository(User);
    const user = userRepo.create({
      email: `news-test-${Date.now()}@example.com`,
      password: 'irrelevant',
      firstName: 'News',
      lastName: 'Tester',
      phone: '0000',
      gender: Gender.Male,
      birthday: new Date('1990-01-01'),
      state: 'SP',
      city: 'SP',
      lgpd: true,
    });
    const saved = await userRepo.save(user);
    fakeUserId = saved.id;
  });

  afterAll(async () => {
    if (app) {
      await dataSource
        .createQueryBuilder()
        .delete()
        .from(News)
        .execute()
        .catch(() => undefined);
      await app.close();
    }
  });

  async function listNews(): Promise<News[]> {
    return dataSource.getRepository(News).find();
  }

  async function createNews(opts: {
    title: string;
    destaque?: boolean;
    description?: string;
  }) {
    const req = request(app.getHttpServer())
      .post('/news')
      .field('title', opts.title);
    if (opts.destaque !== undefined) {
      req.field('destaque', String(opts.destaque));
    }
    if (opts.description !== undefined) {
      req.field('description', opts.description);
    }
    return req.attach('file', Buffer.from('fake-docx-content'), 'fake.docx');
  }

  it('cria com destaque=true', async () => {
    const res = await createNews({ title: 'A', destaque: true });
    expect(res.status).toBe(201);
    expect(res.body.destaque).toBe(true);
  });

  it('marcar segunda novidade como destaque desmarca a primeira', async () => {
    const second = await createNews({ title: 'B', destaque: true });
    expect(second.status).toBe(201);
    expect(second.body.destaque).toBe(true);

    const all = await listNews();
    const flagged = all.filter((n) => n.destaque);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].title).toBe('B');
  });

  it('PATCH destaque=true em outra registra mutex no banco', async () => {
    const third = await createNews({ title: 'C', destaque: false });
    const id = third.body.id;

    const patch = await request(app.getHttpServer())
      .patch(`/news/${id}`)
      .send({ destaque: true });
    expect(patch.status).toBe(200);

    const all = await listNews();
    const flagged = all.filter((n) => n.destaque);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].id).toBe(id);
  });

  it('rejeita description com mais de 280 chars no PATCH', async () => {
    const news = await createNews({ title: 'D' });
    const id = news.body.id;

    const res = await request(app.getHttpServer())
      .patch(`/news/${id}`)
      .send({ description: 'x'.repeat(281) });
    expect(res.status).toBe(400);
  });

  it('aceita description com até 280 chars', async () => {
    const news = await createNews({ title: 'E' });
    const id = news.body.id;

    const res = await request(app.getHttpServer())
      .patch(`/news/${id}`)
      .send({ description: 'x'.repeat(280) });
    expect(res.status).toBe(200);
    expect(res.body.description).toHaveLength(280);
  });
});
