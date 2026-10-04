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

/**
 * Card 35: cada recusa diz o que a pessoa faz em seguida. "Ilegível" para um QR
 * que nem é de cartão-resposta fazia tirar cinco fotos da mesma folha.
 */
export const TEXTOS_DO_QR = {
  naoImagem: 'O arquivo enviado não é uma imagem. Envie uma foto do cartão.',
  ilegivel:
    'Não foi possível ler o QR do cartão. Tire outra foto com o QR inteiro, nítido e sem reflexo.',
  naoECartao: 'Este QR não é de um cartão-resposta do Você na Facul.',
} as const;

export async function decodeCartaoQr(buffer: Buffer): Promise<CartaoQr> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw new BadRequestException(TEXTOS_DO_QR.naoImagem);
    });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  if (!code) {
    throw new BadRequestException(TEXTOS_DO_QR.ilegivel);
  }

  let payload: { simuladoId?: unknown; cartaoCode?: unknown };
  try {
    payload = JSON.parse(code.data);
  } catch {
    throw new BadRequestException(TEXTOS_DO_QR.naoECartao);
  }

  if (!payload?.simuladoId || !payload?.cartaoCode) {
    throw new BadRequestException(TEXTOS_DO_QR.naoECartao);
  }

  return {
    simuladoId: String(payload.simuladoId),
    cartaoCode: String(payload.cartaoCode),
  };
}
