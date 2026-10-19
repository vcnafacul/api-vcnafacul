import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { HttpException } from '@nestjs/common';
import {
  CACHE_DA_FOTO,
  CollaboratorController,
} from './collaborator.controller';
import { CollaboratorService } from './collaborator.service';

/**
 * Rotas literais da série 040 não podem cair num `:id`.
 * ⚠️ Só um app de verdade pega colisão de rota (ver `questao-rotas.controller.spec.ts`).
 */
describe('CollaboratorController — rotas de ex-membro', () => {
  let app: INestApplication;
  const service = {
    getExMembros: jest.fn().mockResolvedValue({ data: [], totalItems: 0 }),
    excluir: jest
      .fn()
      .mockResolvedValue({ id: 'c1', role: { id: 'r', name: 'aluno' } }),
    getPhoto: jest.fn(),
    getFrentes: jest.fn(),
    getPrepCourse: jest.fn(),
  };
  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'gestor' };
      return true;
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [CollaboratorController],
      providers: [{ provide: CollaboratorService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passaTudo)
      .overrideGuard(PermissionsGuard)
      .useValue(passaTudo)
      .compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /collaborator/ex-membros cai no getExMembros', async () => {
    const res = await request(app.getHttpServer()).get(
      '/collaborator/ex-membros?page=2&limit=10',
    );
    expect(res.status).toBe(200);
    expect(service.getExMembros).toHaveBeenCalledWith('gestor', '2', '10');
  });

  it('PATCH /collaborator/:id/excluir repassa id, quem pede e roleId', async () => {
    const res = await request(app.getHttpServer())
      .patch('/collaborator/c1/excluir')
      .send({ roleId: 'r-rev' });
    expect(res.status).toBe(200);
    expect(service.excluir).toHaveBeenCalledWith('c1', 'gestor', 'r-rev');
  });

  describe('GET /collaborator/:imageKey/photo — cache no navegador (2026-10-19)', () => {
    it('sucesso: devolve a foto com Cache-Control imutável e decodifica a chave', async () => {
      service.getPhoto.mockResolvedValueOnce({
        buffer: 'AAA',
        contentType: 'image/png',
      });
      const res = await request(app.getHttpServer()).get(
        `/collaborator/${encodeURIComponent('collaborators/abc.png')}/photo`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ buffer: 'AAA', contentType: 'image/png' });
      expect(res.headers['cache-control']).toBe(CACHE_DA_FOTO);
      expect(service.getPhoto).toHaveBeenLastCalledWith(
        'collaborators/abc.png',
      );
    });

    it('⚠️ erro (chave que não existe): sem Cache-Control, o navegador não guarda o erro', async () => {
      service.getPhoto.mockRejectedValueOnce(
        new HttpException('não achou', 404),
      );
      const res = await request(app.getHttpServer()).get(
        '/collaborator/nao-existe/photo',
      );
      expect(res.status).toBe(404);
      expect(res.headers['cache-control']).not.toBe(CACHE_DA_FOTO);
    });
  });
});
