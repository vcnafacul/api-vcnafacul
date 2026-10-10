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
  return payloadDoCartao(await lerQr(buffer));
}

/** A foto pronta para guardar e ler: em pé, com o QR já decodificado (tickets/037). */
export interface FotoDoCartao extends CartaoQr {
  buffer: Buffer;
  contentType: string;
  /**
   * Quanto a foto foi girada (graus, horário) para ficar em pé: 0, 90, 180 ou 270. Soma a
   * orientação EXIF com a do QR — é o número que vai para o log.
   */
  rotacao: number;
}

/**
 * Lê o QR do cartão e devolve a foto **em pé** (tickets/037).
 *
 * ⚠️ **Por que girar aqui.** O OMRChecker acha os 4 marcadores por quadrante, e os 4 são
 * idênticos: com o cartão deitado ele "endireita" a foto errado e lê letras trocadas, com o
 * histórico concluído e sem aviso (relatório de leitura, docs: projeto/relatorio-leitura-cartao).
 * O QR é o único elemento do cartão que diz onde é "em cima": no cartão em pé ele fica sem
 * rotação, então o ângulo do vetor canto-superior-esquerdo → canto-superior-direito do QR é o
 * quanto a foto está girada.
 *
 * ⚠️ **EXIF primeiro.** Celular pode salvar a foto "de lado" com a tag de orientação; o `sharp`
 * lê os pixels crus e o ms-omr também. Aplicar a tag antes faz a foto chegar como a pessoa viu.
 *
 * ⚠️ **Foto em pé e sem EXIF de rotação sai com os MESMOS bytes**: reencodar recomprime, e não
 * há motivo para mexer no que já está certo.
 */
export async function prepararFotoDoCartao(
  original: Buffer,
  mimetype?: string,
): Promise<FotoDoCartao> {
  const meta = await sharp(original)
    .metadata()
    .catch(() => {
      throw new BadRequestException(TEXTOS_DO_QR.naoImagem);
    });
  const rotacaoExif = ROTACAO_DO_EXIF[meta.orientation ?? 1] ?? 0;
  const exifGirado = (meta.orientation ?? 1) > 1;

  // `rotate()` sem argumento aplica a tag EXIF e a remove.
  let buffer = exifGirado
    ? await sharp(original).rotate().jpeg({ quality: 92 }).toBuffer()
    : original;

  const code = await lerQr(buffer);
  const qr = payloadDoCartao(code);
  const rotacaoQr = rotacaoPeloQr(code.location);

  if (rotacaoQr !== 0) {
    buffer = await sharp(buffer)
      .rotate(rotacaoQr)
      .jpeg({ quality: 92 })
      .toBuffer();
  }

  const reencodada = exifGirado || rotacaoQr !== 0;
  return {
    ...qr,
    buffer,
    contentType: reencodada ? 'image/jpeg' : (mimetype ?? 'image/jpeg'),
    rotacao: (rotacaoExif + rotacaoQr) % 360,
  };
}

/** Graus (horário) que a tag EXIF manda girar. Espelhadas (2, 4, 5, 7) não vêm de câmera. */
const ROTACAO_DO_EXIF: Record<number, number> = { 3: 180, 6: 90, 8: 270 };

/**
 * Quanto girar (horário, em múltiplos de 90°) para o QR — e o cartão — ficar em pé.
 *
 * No cartão em pé o vetor do canto superior-esquerdo ao superior-direito do QR aponta para a
 * direita (0°). Se ele aponta para baixo (90°, com y crescendo para baixo), a foto está girada
 * 90° no sentido horário, e corrige-se girando 270°.
 */
export function rotacaoPeloQr(location: {
  topLeftCorner: { x: number; y: number };
  topRightCorner: { x: number; y: number };
}): number {
  const { topLeftCorner: a, topRightCorner: b } = location;
  const graus = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const girada = (((Math.round(graus / 90) * 90) % 360) + 360) % 360;
  return (360 - girada) % 360;
}

async function lerQr(buffer: Buffer) {
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
  return code;
}

function payloadDoCartao(code: { data: string }): CartaoQr {
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
