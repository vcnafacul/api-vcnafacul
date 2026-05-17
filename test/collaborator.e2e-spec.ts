import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { Collaborator } from 'src/modules/prepCourse/collaborator/collaborator.entity';
import { Gender } from 'src/modules/user/enum/gender';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

describe('Collaborator admin photo upload (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let permissionGranted = true;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => permissionGranted })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    const blobService = moduleFixture.get<any>('BlobService');
    let counter = 0;
    jest
      .spyOn(blobService, 'uploadFile')
      .mockImplementation(async () => `collaborators/fake-${++counter}.jpg`);
    jest.spyOn(blobService, 'getFile').mockResolvedValue({
      buffer: '',
      contentType: 'image/jpeg',
    });
    jest.spyOn(blobService, 'deleteFile').mockResolvedValue(undefined);

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedCollaborator(): Promise<{ id: string; userId: string }> {
    const userRepo = dataSource.getRepository(User);
    const user = userRepo.create({
      email: `collab-${Date.now()}-${Math.random()}@example.com`,
      password: 'irrelevant',
      firstName: 'Collab',
      lastName: 'Tester',
      phone: '0000',
      gender: Gender.Male,
      birthday: new Date('1990-01-01'),
      state: 'SP',
      city: 'SP',
      lgpd: true,
    });
    const savedUser = await userRepo.save(user);

    const collabRepo = dataSource.getRepository(Collaborator);
    const collab = collabRepo.create({
      user: savedUser,
      description: 'seed',
      actived: true,
    });
    const savedCollab = await collabRepo.save(collab);
    return { id: savedCollab.id, userId: savedUser.id };
  }

  it('admin uploads a photo for any collaborator (200) and persists key on entity', async () => {
    permissionGranted = true;
    const { id } = await seedCollaborator();

    const response = await request(app.getHttpServer())
      .patch(`/collaborator/${id}/photo`)
      .attach('file', Buffer.from('fake-image'), {
        filename: 'pic.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(200);
    expect(response.text).toMatch(/^collaborators\/fake-\d+\.jpg$/);

    const persisted = await dataSource
      .getRepository(Collaborator)
      .findOne({ where: { id } });
    expect(persisted?.photo).toBe(response.text);
  });

  it('returns 403 when caller lacks alterar_permissao', async () => {
    permissionGranted = false;
    const { id } = await seedCollaborator();

    const response = await request(app.getHttpServer())
      .patch(`/collaborator/${id}/photo`)
      .attach('file', Buffer.from('x'), {
        filename: 'pic.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(403);
    permissionGranted = true;
  });

  it('returns 404 when collaborator id is unknown', async () => {
    permissionGranted = true;
    const response = await request(app.getHttpServer())
      .patch(`/collaborator/00000000-0000-0000-0000-000000000000/photo`)
      .attach('file', Buffer.from('x'), {
        filename: 'pic.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(404);
  });
});
