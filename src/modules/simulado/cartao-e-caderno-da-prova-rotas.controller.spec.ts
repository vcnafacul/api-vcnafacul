import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { AtorService } from './ator/ator.service';
import { CadernoHttpService } from './caderno/caderno-http.service';
import { CadernoLogosService } from './caderno/caderno-logos.service';
import { CadernoController } from './caderno/caderno.controller';
import { CadernoTemplateController } from './caderno/caderno-template.controller';
import { CadernoTemplateHttpService } from './caderno/caderno-template-http.service';
import { CartaoExclusaoService } from './cartao-resposta/cartao-exclusao.service';
import { CartaoImagemService } from './cartao-resposta/cartao-imagem.service';
import { CartaoReprocessoService } from './cartao-resposta/cartao-reprocesso.service';
import { CartaoRespostaHttpService } from './cartao-resposta/cartao-resposta-http.service';
import { CartaoRespostaResultadosService } from './cartao-resposta/cartao-resposta-resultados.service';
import { CartaoRespostaController } from './cartao-resposta/cartao-resposta.controller';
import { CartaoUploadService } from './cartao-resposta/cartao-upload.service';
import { ProvaService } from './prova/prova.service';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { SimuladoService } from './simulado.service';

/**
 * tickets/038, card 10 — cartão e caderno DA PROVA, num app de verdade, junto das rotas por
 * simulado: colisão de rota (literal × `:param`) nasce no roteamento, e só um app a pega.
 */
describe('cartão e caderno da prova — rotas', () => {
  let app: INestApplication;
  const ID = '65ecc850a528b39d273e7900';
  const pdf = { buffer: Buffer.from('PDF'), contentType: 'application/pdf' };
  const zip = { buffer: Buffer.from('ZIP'), contentType: 'application/zip' };

  const cartaoHttp = {
    baixarCartao: jest.fn().mockResolvedValue(pdf),
    baixarCartaoDaProva: jest.fn().mockResolvedValue(pdf),
  };
  const cadernoHttp = {
    baixar: jest.fn().mockResolvedValue(zip),
    baixarDaProva: jest.fn().mockResolvedValue(zip),
  };
  const ator = { resolver: jest.fn() };
  const provas = { getProvaById: jest.fn() };
  const simulados = { getById: jest.fn() };

  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'colab-1' };
      return true;
    },
  };

  beforeAll(async () => {
    const vazio = {};
    const modulo = await Test.createTestingModule({
      controllers: [
        CartaoRespostaController,
        CadernoController,
        CadernoTemplateController,
      ],
      providers: [
        { provide: CartaoRespostaHttpService, useValue: cartaoHttp },
        { provide: CadernoHttpService, useValue: cadernoHttp },
        {
          provide: CadernoLogosService,
          useValue: { resolver: async () => ({}) },
        },
        { provide: CadernoTemplateHttpService, useValue: vazio },
        { provide: CartaoRespostaResultadosService, useValue: vazio },
        { provide: CartaoUploadService, useValue: vazio },
        { provide: CartaoReprocessoService, useValue: vazio },
        { provide: CartaoImagemService, useValue: vazio },
        { provide: CartaoExclusaoService, useValue: vazio },
        { provide: AtorService, useValue: ator },
        { provide: SimuladoService, useValue: simulados },
        { provide: ProvaService, useValue: provas },
        { provide: AuditLogService, useValue: vazio },
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

  beforeEach(() => {
    jest.clearAllMocks();
    ator.resolver.mockResolvedValue({ cursinhoId: 'c1' });
    provas.getProvaById.mockResolvedValue({ _id: ID, cursinhoId: 'c1' });
    simulados.getById.mockResolvedValue({ _id: ID, cursinhoId: 'c1' });
  });

  it('cartão da prova cai no handler da PROVA', async () => {
    await request(app.getHttpServer())
      .get(`/mssimulado/cartao-resposta/prova/${ID}`)
      .expect(200)
      .expect('Content-Type', /pdf/);
    expect(cartaoHttp.baixarCartaoDaProva).toHaveBeenCalledWith(ID);
    expect(cartaoHttp.baixarCartao).not.toHaveBeenCalled();
  });

  it('o cartão do simulado continua no handler dele', async () => {
    await request(app.getHttpServer())
      .get(`/mssimulado/cartao-resposta/${ID}`)
      .expect(200);
    expect(cartaoHttp.baixarCartao).toHaveBeenCalledWith(ID);
    expect(cartaoHttp.baixarCartaoDaProva).not.toHaveBeenCalled();
  });

  it('caderno da prova cai no handler da PROVA; o do simulado, no dele', async () => {
    await request(app.getHttpServer())
      .get(`/mssimulado/caderno/prova/${ID}`)
      .expect(200);
    expect(cadernoHttp.baixarDaProva).toHaveBeenCalledWith(ID, {}, false);
    expect(cadernoHttp.baixar).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}`)
      .expect(200);
    expect(cadernoHttp.baixar).toHaveBeenCalled();
  });

  it('⚠️ prova de outro cursinho → 403 e nada é baixado', async () => {
    provas.getProvaById.mockResolvedValue({ _id: ID, cursinhoId: 'outro' });
    await request(app.getHttpServer())
      .get(`/mssimulado/cartao-resposta/prova/${ID}`)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/mssimulado/caderno/prova/${ID}`)
      .expect(403);
    expect(cartaoHttp.baixarCartaoDaProva).not.toHaveBeenCalled();
    expect(cadernoHttp.baixarDaProva).not.toHaveBeenCalled();
  });

  it('id que não é ObjectId não casa rota da prova', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/caderno/prova/nao-e-id')
      .expect(404);
    expect(cadernoHttp.baixarDaProva).not.toHaveBeenCalled();
  });

  it('⚠️ a permissão é declarada POR ROTA (o guard lê só o handler)', () => {
    const permissao = (h: (...a: never[]) => unknown) =>
      Reflect.getMetadata(PermissionsGuard.name, h);
    const esperada = [
      Permissions.visualizarProvas,
      Permissions.visualizarProvasCursinho,
    ];
    expect(
      permissao(CartaoRespostaController.prototype.baixarCartaoDaProva),
    ).toEqual(esperada);
    expect(permissao(CadernoController.prototype.baixarDaProva)).toEqual(
      esperada,
    );
  });
});
