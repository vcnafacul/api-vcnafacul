import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('health', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect('OK');
  });

  describe('POST /frontend-errors', () => {
    it('aceita payload e retorna 200 com status ok', () => {
      return request(app.getHttpServer())
        .post('/frontend-errors')
        .send({
          errorType: 'FETCH_ERROR',
          message: 'Failed to fetch',
          page: '/test',
          origin: 'fetchWrapper',
          request: { method: 'GET', url: '/api/test' },
          metadata: { userAgent: 'test', online: true, release: '1.0.0' },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ status: 'ok' });
        });
    });

    it('aceita body mínimo e retorna 200', () => {
      return request(app.getHttpServer())
        .post('/frontend-errors')
        .send({ message: 'Some error' })
        .expect(200)
        .expect((res) => expect(res.body.status).toBe('ok'));
    });
  });
});
