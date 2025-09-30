import * as sharp from 'sharp';

export async function createThumbnail(fileBuffer: Buffer): Promise<Buffer> {
  return sharp(fileBuffer).resize(128, 128).webp({ quality: 10 }).toBuffer();
}
