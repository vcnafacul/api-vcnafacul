import { BadRequestException } from '@nestjs/common';
import jsQR from 'jsqr';
// sharp usa `export =` (module.exports = sharp). A resolução de TIPOS do sharp diverge entre
// ambientes (local: lib/index.d.ts callable; CI: dist/index sem call signature) → `import sharp =
// require('sharp')` dá TS2349 no CI. `require` puro compila em qualquer layout (any é sempre
// callable; o projeto tem no-explicit-any off) e no runtime module.exports já é a função.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

export interface CartaoQr {
  simuladoId: string;
  cartaoCode: string;
}

export async function decodeCartaoQr(buffer: Buffer): Promise<CartaoQr> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  if (!code) {
    throw new BadRequestException('QR do cartão ilegível');
  }

  let payload: { simuladoId?: unknown; cartaoCode?: unknown };
  try {
    payload = JSON.parse(code.data);
  } catch {
    throw new BadRequestException('QR do cartão inválido');
  }

  if (!payload?.simuladoId || !payload?.cartaoCode) {
    throw new BadRequestException('QR do cartão sem simuladoId/cartaoCode');
  }

  return {
    simuladoId: String(payload.simuladoId),
    cartaoCode: String(payload.cartaoCode),
  };
}
