jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('jsqr', () => ({ __esModule: true, default: jest.fn() }));
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { decodeCartaoQr } from './qr-decoder';

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
  (sharp as unknown as jest.Mock).mockReturnValue(chain);
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
