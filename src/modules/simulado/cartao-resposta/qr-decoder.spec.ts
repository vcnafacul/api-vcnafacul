jest.mock('sharp', () => jest.fn());
jest.mock('jsqr', () => ({ __esModule: true, default: jest.fn() }));
import { BadRequestException } from '@nestjs/common';
import jsQR from 'jsqr';
import { decodeCartaoQr, TEXTOS_DO_QR } from './qr-decoder';

// sharp é consumido via require() no qr-decoder → o mock é a própria função (module.exports).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp') as jest.Mock;

function mockSharp() {
  const chain: any = {
    ensureAlpha: () => chain,
    raw: () => chain,
    toBuffer: () =>
      Promise.resolve({
        data: Buffer.alloc(16),
        info: { width: 2, height: 2 },
      }),
  };
  sharp.mockReturnValue(chain);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSharp();
});

it('decodifica QR → {simuladoId, cartaoCode}', async () => {
  (jsQR as jest.Mock).mockReturnValue({
    data: JSON.stringify({
      simuladoId: '665',
      cartaoCode: '7',
      cursinhoId: 'c',
      templateVersion: 'v1',
    }),
  });
  await expect(decodeCartaoQr(Buffer.from('IMG'))).resolves.toEqual({
    simuladoId: '665',
    cartaoCode: '7',
  });
});

it('jsqr null → 400', async () => {
  (jsQR as jest.Mock).mockReturnValue(null);
  await expect(decodeCartaoQr(Buffer.from('X'))).rejects.toBeInstanceOf(
    BadRequestException,
  );
});

it('JSON inválido → 400', async () => {
  (jsQR as jest.Mock).mockReturnValue({ data: 'não-json' });
  await expect(decodeCartaoQr(Buffer.from('X'))).rejects.toBeInstanceOf(
    BadRequestException,
  );
});

it('sem simuladoId/cartaoCode → 400', async () => {
  (jsQR as jest.Mock).mockReturnValue({
    data: JSON.stringify({ simuladoId: '665' }),
  });
  await expect(decodeCartaoQr(Buffer.from('X'))).rejects.toBeInstanceOf(
    BadRequestException,
  );
});

describe('mensagens (card 35)', () => {
  it('QR não lido: manda tirar outra foto', async () => {
    (jsQR as jest.Mock).mockReturnValue(null);
    await expect(decodeCartaoQr(Buffer.from('X'))).rejects.toThrow(
      TEXTOS_DO_QR.ilegivel,
    );
  });

  it('QR lido, mas não é de cartão: NÃO diz "ilegível"', async () => {
    (jsQR as jest.Mock).mockReturnValue({ data: 'https://exemplo.com' });
    await expect(decodeCartaoQr(Buffer.from('X'))).rejects.toThrow(
      TEXTOS_DO_QR.naoECartao,
    );
    (jsQR as jest.Mock).mockReturnValue({
      data: JSON.stringify({ simuladoId: '665' }),
    });
    await expect(decodeCartaoQr(Buffer.from('X'))).rejects.toThrow(
      TEXTOS_DO_QR.naoECartao,
    );
  });

  it('arquivo que não é imagem: 400, não 500', async () => {
    const chain: any = {
      ensureAlpha: () => chain,
      raw: () => chain,
      toBuffer: () => Promise.reject(new Error('unsupported image format')),
    };
    sharp.mockReturnValue(chain);
    await expect(decodeCartaoQr(Buffer.from('PDF'))).rejects.toThrow(
      new BadRequestException(TEXTOS_DO_QR.naoImagem),
    );
  });
});
