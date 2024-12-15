/* eslint-disable @typescript-eslint/no-var-requires */
const sharp = require('sharp');

export const compressImage = async (
  file: Buffer,
  quality: number = 50,
): Promise<Buffer> => {
  return await sharp(file).jpeg({ quality }).toBuffer(); // Configura a qualidade da imagem JPEG
};
