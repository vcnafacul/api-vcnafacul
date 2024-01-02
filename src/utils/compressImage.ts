/* eslint-disable @typescript-eslint/no-var-requires */
const sharp = require('sharp');

export const compressImage = async (
  outputPath: string,
  imagePath: string,
  quality: number = 50,
): Promise<void> => {
  await sharp(imagePath)
    .jpeg({ quality }) // Configura a qualidade da imagem JPEG
    .toFile(outputPath);
};
