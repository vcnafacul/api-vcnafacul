import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CategoriaProxyController } from '../categoria.controller';
import { CategoriaProxyService } from '../categoria.service';
import { CursinhoResolverService } from '../../prova/cursinho/cursinho-resolver.service';
import { CursinhoCategoriaController } from './cursinho-categoria.controller';

/**
 * Os dois controllers de categoria montados **juntos**, como no módulo.
 *
 * ⚠️ **Só um app de verdade pega isto.** A colisão literal × `:param` não
 * existe no controller -- ela nasce no roteamento, e chamar o método direto
 * sempre funciona. Este repositório já foi mordido por isso (ver
 * `questao-rotas.controller.spec.ts` e o docblock da ordem dos controllers em
 * `simulado.module.ts`).
 *
 * ⚠️ O prefixo escolhido (`mssimulado/cursinho/categoria`, e não
 * `mssimulado/categoria/cursinho`) é justamente o que mantém as duas árvores
 * disjuntas -- o segundo segmento já difere. Este teste é a trava que impede
 * alguém de "arrumar" o prefixo para o formato que colidiria.
 */
describe('Categoria — a rota do cursinho não é engolida pelo :id do admin', () => {
  let app: INestApplication;

  const categoriaService = {
    getAll: jest.fn().mockResolvedValue({ data: [] }),
    getById: jest.fn().mockResolvedValue({ _id: 'abc' }),
    create: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
  };

  // Guard que também popula o `req.user`, de que o controller do cursinho
  // depende para resolver o dono.
  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'u1' };
      return true;
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [CategoriaProxyController, CursinhoCategoriaController],
      providers: [
        { provide: CategoriaProxyService, useValue: categoriaService },
        { provide: CursinhoResolverService, useValue: cursinhoResolver },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passaTudo)
      .overrideGuard(PermissionsGuard)
      .useValue(passaTudo)
      .compile();

    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('GET /mssimulado/cursinho/categoria chega no controller do cursinho', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/cursinho/categoria?page=1&limit=40')
      .expect(200);

    expect(categoriaService.getAll).toHaveBeenCalledWith('1', '40', 'cur-1');
    // ⚠️ A asserção que separa "respondeu" de "respondeu pelo caminho certo":
    // sem ela, um getById com id = "cursinho" passaria batido.
    expect(categoriaService.getById).not.toHaveBeenCalled();
  });

  it('GET /mssimulado/categoria/abc continua chegando no getById do admin', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/categoria/abc')
      .expect(200);

    expect(categoriaService.getById).toHaveBeenCalledWith('abc');
    expect(cursinhoResolver.resolveCursinhoIdByUserId).not.toHaveBeenCalled();
  });
});
