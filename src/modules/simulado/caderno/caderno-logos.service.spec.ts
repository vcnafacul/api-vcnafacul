import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CadernoLogosService } from './caderno-logos.service';

// sharp usa `export =` e a resolução de TIPOS diverge entre ambientes (ver o
// comentário no `qr-decoder.ts`). `require` puro compila em qualquer layout.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

const USER_ID = 'user-1';
const PARTNER_ID = 'partner-1';

/** PNG 1x1 de verdade — o `sharp` precisa decodificar. */
async function pngReal(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

async function jpegReal(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();
}

function montar(
  over: {
    blobService?: Record<string, unknown>;
    partnerService?: Record<string, unknown>;
  } = {},
) {
  const blobService = { getFile: jest.fn(), ...over.blobService };
  const partnerService = {
    getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
    getLogo: jest.fn(),
    ...over.partnerService,
  };
  const envService = { get: jest.fn().mockReturnValue('bucket-home') };
  const cache = { wrap: jest.fn((_k: string, fn: () => unknown) => fn()) };

  const service = new CadernoLogosService(
    blobService as never,
    partnerService as never,
    envService as never,
    cache as never,
  );

  return { service, blobService, partnerService, envService, cache };
}

async function comOsDois() {
  const b64 = (await pngReal()).toString('base64');
  const resposta = { buffer: b64, contentType: 'image/png' };
  return montar({
    blobService: { getFile: jest.fn().mockResolvedValue(resposta) },
    partnerService: {
      getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
      getLogo: jest.fn().mockResolvedValue(resposta),
    },
  });
}

describe('CadernoLogosService — caminho feliz', () => {
  it('resolve os dois logos', async () => {
    const { service } = await comOsDois();

    const logos = await service.resolver(USER_ID);

    expect(logos.vnf).toBeInstanceOf(Buffer);
    expect(logos.cursinho).toBeInstanceOf(Buffer);
  });

  it('busca o logo do VNF pela chave logo.png no BUCKET_HOME', async () => {
    const { service, blobService, envService } = await comOsDois();

    await service.resolver(USER_ID);

    expect(envService.get).toHaveBeenCalledWith('BUCKET_HOME');
    expect(blobService.getFile).toHaveBeenCalledWith('logo.png', 'bucket-home');
  });

  it('cacheia o logo do VNF na chave e no TTL combinados', async () => {
    const { service, cache } = await comOsDois();

    await service.resolver(USER_ID);

    // Chave errada serve outro objeto cacheado; TTL omitido cai no padrão do
    // `CacheService`. Os dois são contrato, não detalhe.
    expect(cache.wrap).toHaveBeenCalledWith(
      'caderno:logo-vnf',
      expect.any(Function),
      60 * 60 * 24 * 1000,
    );
  });

  it('usa o cursinho do usuário que pediu', async () => {
    const { service, partnerService } = await comOsDois();

    await service.resolver(USER_ID);

    expect(partnerService.getByUserId).toHaveBeenCalledWith(USER_ID);
    expect(partnerService.getLogo).toHaveBeenCalledWith(PARTNER_ID);
  });
});

describe('CadernoLogosService — conversão para PNG', () => {
  // ⚠️ O `updateLogo` do cursinho não valida tipo de arquivo nenhum. Um logo
  // em JPEG dentro de um arquivo chamado `logo_cursinho.png` quebra a
  // compilação: o pdflatex escolhe o leitor pela extensão. O erro aparece no
  // Overleaf de quem baixou, longe da causa.
  it('converte um logo em JPEG para PNG de verdade', async () => {
    const jpeg = await jpegReal();
    const { service } = montar({
      partnerService: {
        getLogo: jest.fn().mockResolvedValue({
          buffer: jpeg.toString('base64'),
          contentType: 'image/jpeg',
        }),
      },
    });

    const logos = await service.resolver(USER_ID);

    expect((await sharp(logos.cursinho).metadata()).format).toBe('png');
  });
});

describe('CadernoLogosService — falha nunca derruba o download', () => {
  it('usuário sem cursinho: getByUserId lança 404 e vira ausência', async () => {
    const b64 = (await pngReal()).toString('base64');
    const { service } = montar({
      blobService: {
        getFile: jest.fn().mockResolvedValue({ buffer: b64 }),
      },
      partnerService: {
        getByUserId: jest
          .fn()
          .mockRejectedValue(
            new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND),
          ),
      },
    });

    const logos = await service.resolver(USER_ID);

    expect(logos.cursinho).toBeUndefined();
    expect(logos.vnf).toBeInstanceOf(Buffer);
  });

  it('cursinho sem logo cadastrado vira ausência', async () => {
    const { service } = montar({
      partnerService: {
        getLogo: jest.fn().mockResolvedValue({ buffer: null }),
      },
    });

    const logos = await service.resolver(USER_ID);

    expect(logos.cursinho).toBeUndefined();
  });

  it('bucket fora no logo do VNF vira ausência', async () => {
    const { service } = montar({
      blobService: { getFile: jest.fn().mockRejectedValue(new Error('S3')) },
    });

    const logos = await service.resolver(USER_ID);

    expect(logos.vnf).toBeUndefined();
  });

  it('bytes que não são imagem viram ausência, não exceção do sharp', async () => {
    const { service } = montar({
      blobService: {
        getFile: jest.fn().mockResolvedValue({
          buffer: Buffer.from('isto não é imagem').toString('base64'),
        }),
      },
    });

    const logos = await service.resolver(USER_ID);

    expect(logos.vnf).toBeUndefined();
  });

  it('as duas falhas juntas devolvem objeto vazio, sem lançar', async () => {
    const { service } = montar({
      blobService: { getFile: jest.fn().mockRejectedValue(new Error('S3')) },
      partnerService: {
        getByUserId: jest.fn().mockRejectedValue(new Error('db')),
      },
    });

    await expect(service.resolver(USER_ID)).resolves.toEqual({});
  });

  it('uma falha não impede a outra de entregar o resultado', async () => {
    const b64 = (await pngReal()).toString('base64');
    const { service } = montar({
      blobService: {
        getFile: jest.fn().mockResolvedValue({ buffer: b64 }),
      },
      partnerService: {
        getByUserId: jest.fn().mockRejectedValue(new Error('db')),
      },
    });

    const logos = await service.resolver(USER_ID);

    // ⚠️ O que prende a guarda POR RAMO: se o `semQuebrar` envolvesse o
    // `Promise.all` inteiro, a falha do cursinho levaria junto o vnf já
    // resolvido. Aferir que o `getFile` foi chamado não pega isso — o
    // `Promise.all` dispara os dois ramos de qualquer jeito.
    expect(logos.vnf).toBeInstanceOf(Buffer);
    expect(logos.cursinho).toBeUndefined();
  });
});

describe('CadernoLogosService — o próprio catch não pode lançar', () => {
  it('rejeição sem valor (undefined) também vira ausência', async () => {
    const { service } = montar({
      blobService: { getFile: jest.fn().mockRejectedValue(undefined) },
      partnerService: {
        getByUserId: jest.fn().mockRejectedValue(null),
      },
    });

    await expect(service.resolver(USER_ID)).resolves.toEqual({});
  });
});

describe('CadernoLogosService — nível de log separa rotina de incidente', () => {
  let erro: jest.SpyInstance;
  let info: jest.SpyInstance;

  beforeEach(() => {
    erro = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    info = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('usuário sem cursinho não polui o log de erro', async () => {
    const { service } = montar({
      partnerService: {
        getByUserId: jest
          .fn()
          .mockRejectedValue(
            new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND),
          ),
      },
    });

    await service.resolver(USER_ID);

    expect(erro).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('logo cursinho não resolvido'),
    );
  });

  it('bucket fora continua sendo erro', async () => {
    const { service } = montar({
      blobService: { getFile: jest.fn().mockRejectedValue(new Error('S3')) },
    });

    await service.resolver(USER_ID);

    expect(erro).toHaveBeenCalledWith(
      expect.stringContaining('logo vnf não resolvido'),
    );
  });

  // ⚠️ O `s3Service.getFile` traduz o `NoSuchKey` do S3 para o MESMO
  // `HttpException(NOT_FOUND)` que o `getByUserId` lança. Se a expectativa
  // fosse pelo status e não pelo ramo, o `logo.png` fora do bucket — erro de
  // configuração — seria rebaixado para `log` e ninguém veria.
  it('logo do VNF ausente no bucket é erro, apesar de também ser 404', async () => {
    const { service } = montar({
      blobService: {
        getFile: jest
          .fn()
          .mockRejectedValue(
            new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND),
          ),
      },
    });

    await service.resolver(USER_ID);

    expect(erro).toHaveBeenCalledWith(
      expect.stringContaining('logo vnf não resolvido'),
    );
  });
});

/** PNG quadrado de `lado` px, com ruído para não comprimir a quase nada. */
async function pngGrande(lado: number): Promise<Buffer> {
  const pixels = Buffer.alloc(lado * lado * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 2654435761) % 256;
  return sharp(pixels, { raw: { width: lado, height: lado, channels: 3 } })
    .png()
    .toBuffer();
}

describe('CadernoLogosService — teto de dimensão do logo', () => {
  /**
   * ⚠️ É este teto que impede o `413 request entity too large`, e não o limite
   * de corpo do ms. O logo viaja em base64 no POST interno, com ~33% de
   * inflação: um PNG de 3000px vira megabytes de JSON a cada download.
   */
  it('reduz o logo grande para no máximo 600px de largura', async () => {
    const grande = await pngGrande(1600);
    const resposta = {
      buffer: grande.toString('base64'),
      contentType: 'image/png',
    };
    const { service } = montar({
      blobService: { getFile: jest.fn().mockResolvedValue(resposta) },
      partnerService: {
        getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
        getLogo: jest.fn().mockResolvedValue(resposta),
      },
    });

    const logos = await service.resolver('u1');

    const meta = await sharp(logos.cursinho).metadata();
    expect(meta.width).toBe(600);
    // ⚠️ O que interessa de verdade é o payload, não o pixel: é ele que
    // estourava o corpo da requisição.
    expect(logos.cursinho!.length).toBeLessThan(grande.length);
  });

  it('NÃO amplia um logo menor que o teto', async () => {
    /**
     * ⚠️ Sem `withoutEnlargement`, um logo de 1px seria ampliado para 600 —
     * borrado e MAIOR em bytes que o original, o oposto do que este resize
     * existe para fazer.
     */
    const { service } = await comOsDois();

    const logos = await service.resolver('u1');

    expect((await sharp(logos.cursinho).metadata()).width).toBe(1);
  });

  it('bytes que não são imagem viram ausência de logo, não exceção', async () => {
    /**
     * ⚠️ O nome deste teste é o que ele realmente faz. Ele NÃO exercita o teto
     * de `BYTES_MAXIMOS_LOGO`: depois do resize para 600px esse teto é
     * praticamente inalcançável, e forçá-lo exigiria fabricar um PNG que o
     * `sharp` devolvesse com mais de 2 MB a 600px — o que não representa nada
     * real. O teto fica como rede para o inesperado, e **não tem teste
     * direto**; está registrado no PR.
     *
     * O que se prova aqui é a política do arquivo: falha vira ausência de
     * logo, nunca exceção. Caderno sem logo continua sendo um caderno.
     */
    const lixo = Buffer.alloc(3 * 1024 * 1024, 7);
    const resposta = {
      buffer: lixo.toString('base64'),
      contentType: 'image/png',
    };
    const { service } = montar({
      blobService: { getFile: jest.fn().mockResolvedValue(resposta) },
      partnerService: {
        getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
        getLogo: jest.fn().mockResolvedValue(resposta),
      },
    });

    const logos = await service.resolver('u1');

    expect(logos.cursinho).toBeUndefined();
    expect(logos.vnf).toBeUndefined();
  });
});
