import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

/**
 * `GET /role/recommended` não pode ser engolida pelo `GET /role/:id`.
 *
 * ⚠️ Só um app de verdade pega isto: a colisão nasce no roteamento, não no
 * controller (ver `questao-rotas.controller.spec.ts`).
 */
describe('RoleController — rotas de perfil recomendado', () => {
  let app: INestApplication;

  const service = {
    findRecommended: jest.fn().mockResolvedValue([{ id: 'r1', name: 'X' }]),
    findOneBy: jest.fn().mockResolvedValue({ id: 'x' }),
    setRecommended: jest.fn().mockResolvedValue(undefined),
  };
  const passaTudo = { canActivate: () => true };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [{ provide: RoleService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passaTudo)
      .overrideGuard(PermissionsGuard)
      .useValue(passaTudo)
      .compile();

    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('GET /role/recommended cai no findRecommended, não no :id', async () => {
    const res = await request(app.getHttpServer()).get('/role/recommended');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'r1', name: 'X' }]);
    expect(service.findOneBy).not.toHaveBeenCalled();
  });

  it('PATCH /role/:id/recommended repassa id e flag', async () => {
    const res = await request(app.getHttpServer())
      .patch('/role/r1/recommended')
      .send({ isRecommended: true });
    expect(res.status).toBe(200);
    expect(service.setRecommended).toHaveBeenCalledWith('r1', true);
  });

  it('PATCH sem booleano → 400', async () => {
    const res = await request(app.getHttpServer())
      .patch('/role/r1/recommended')
      .send({ isRecommended: 'sim' });
    expect(res.status).toBe(400);
    expect(service.setRecommended).not.toHaveBeenCalled();
  });
});
