import * as fs from 'fs';
import * as path from 'path';
import jsQR from 'jsqr';
import * as QRCode from 'qrcode';
import { prepararFotoDoCartao, rotacaoPeloQr } from './qr-decoder';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

/**
 * tickets/037 — a foto do cartão sai daqui EM PÉ. Com `sharp` e `jsQR` de verdade (o
 * `qr-decoder.spec.ts` mocka os dois): o que importa é a geometria, e um mock provaria só o
 * que eu mesmo montei.
 */
const PAYLOAD = { simuladoId: 'sim-1', cartaoCode: '7' };
const FIXTURES = path.join(__dirname, '__fixtures__');

/** Uma "folha" branca com o QR no canto superior direito, como no cartão impresso. */
async function folhaEmPe(): Promise<Buffer> {
  const qr = await QRCode.toBuffer(JSON.stringify(PAYLOAD), {
    margin: 4,
    width: 300,
    errorCorrectionLevel: 'H',
  });
  return sharp({
    create: { width: 700, height: 1000, channels: 3, background: 'white' },
  })
    .composite([{ input: qr, left: 360, top: 40 }])
    .jpeg({ quality: 95 })
    .toBuffer();
}

/** O ângulo que o QR tem na imagem (0 = em pé). */
async function rotacaoDaImagem(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  if (!code) throw new Error('QR não lido');
  return rotacaoPeloQr(code.location);
}

describe('prepararFotoDoCartao (tickets/037)', () => {
  it('foto em pé: os MESMOS bytes, sem reencodar', async () => {
    const original = await folhaEmPe();

    const foto = await prepararFotoDoCartao(original, 'image/png');

    expect(foto.buffer).toBe(original);
    expect(foto.rotacao).toBe(0);
    expect(foto.contentType).toBe('image/png');
    expect(foto).toMatchObject(PAYLOAD);
  });

  it.each([90, 180, 270])(
    '⚠️ foto girada %d°: sai em pé, com o mesmo QR',
    async (giro) => {
      const girada = await sharp(await folhaEmPe())
        .rotate(giro)
        .toBuffer();

      const foto = await prepararFotoDoCartao(girada, 'image/jpeg');

      expect(foto.rotacao).toBe((360 - giro) % 360);
      expect(await rotacaoDaImagem(foto.buffer)).toBe(0);
      const { width, height } = await sharp(foto.buffer).metadata();
      expect(height).toBeGreaterThan(width); // retrato, como a folha
      expect(foto).toMatchObject(PAYLOAD);
    },
  );

  it('⚠️ foto com EXIF de rotação: aplica a tag e sai em pé', async () => {
    // Pixels guardados "deitados" + tag 6 (girar 90° para exibir): é como o celular salva.
    const deitadaComTag = await sharp(await folhaEmPe())
      .rotate(270)
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const foto = await prepararFotoDoCartao(deitadaComTag, 'image/jpeg');

    expect(await rotacaoDaImagem(foto.buffer)).toBe(0);
    expect((await sharp(foto.buffer).metadata()).orientation ?? 1).toBe(1);
    expect(foto.contentType).toBe('image/jpeg');
  });

  describe('fotos reais do teste de leitura em homologação', () => {
    it('⚠️ cartão deitado (lido com letras trocadas antes do 037): sai em pé', async () => {
      const deitado = fs.readFileSync(
        path.join(FIXTURES, 'cartao-deitado.jpg'),
      );

      const foto = await prepararFotoDoCartao(deitado, 'image/jpeg');

      expect(foto.rotacao).toBe(270);
      expect(await rotacaoDaImagem(foto.buffer)).toBe(0);
    });

    it('cartão em pé: nada muda', async () => {
      const emPe = fs.readFileSync(path.join(FIXTURES, 'cartao-em-pe.jpg'));

      const foto = await prepararFotoDoCartao(emPe, 'image/jpeg');

      expect(foto.rotacao).toBe(0);
      expect(foto.buffer).toBe(emPe);
    });
  });
});

describe('rotacaoPeloQr', () => {
  const canto = (x: number, y: number) => ({ x, y });
  it.each([
    ['em pé', canto(0, 0), canto(10, 0), 0],
    ['girada 90° horário', canto(10, 0), canto(10, 10), 270],
    ['de cabeça para baixo', canto(10, 10), canto(0, 10), 180],
    ['girada 90° anti-horário', canto(0, 10), canto(0, 0), 90],
    ['torta (87°)', canto(0, 0), canto(0.5, 10), 270],
  ])('%s', (_n, a, b, esperado) => {
    expect(rotacaoPeloQr({ topLeftCorner: a, topRightCorner: b })).toBe(
      esperado,
    );
  });
});
