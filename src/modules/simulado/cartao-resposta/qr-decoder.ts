import { BadRequestException } from '@nestjs/common';
import jsQR from 'jsqr';
import sharp from 'sharp';

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
