import { HttpException, HttpStatus } from '@nestjs/common';
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
        getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
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
        getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
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

  it('uma falha não impede a outra busca de acontecer', async () => {
    const { service, blobService } = montar({
      partnerService: {
        getByUserId: jest.fn().mockRejectedValue(new Error('db')),
      },
    });

    await service.resolver(USER_ID);

    expect(blobService.getFile).toHaveBeenCalled();
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
