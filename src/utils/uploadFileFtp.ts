import * as ftp from 'basic-ftp';
import { compressImage } from './compressImage';
import { Readable } from 'stream';

export const uploadFileFTP = async (
  file: Express.Multer.File,
  FTP_HOST: string,
  FTP_CONTENT: string,
  FTP_PASSWORD: string,
  directory: string = '',
): Promise<string> => {
  const client = new ftp.Client(30000);

  try {
    // Acesso ao servidor FTP
    await client.access({
      host: FTP_HOST,
      user: FTP_CONTENT,
      password: FTP_PASSWORD,
    });

    // Extração do tipo e nome do arquivo
    const typeFile = file.originalname.split('.').pop()?.toLowerCase();
    const nameFile = `${Date.now()}.${typeFile}`;

    // Garante o diretório no servidor FTP, se necessário
    let pathFTP = nameFile;
    if (directory) {
      await client.ensureDir(directory);
      pathFTP = `/${directory}/${pathFTP}`;
    }

    // Manipulação do arquivo em memória
    let fileBuffer = file.buffer;

    if (['jpg', 'jpeg', 'png'].includes(typeFile)) {
      // Compressão de imagem diretamente no buffer
      fileBuffer = await compressImage(fileBuffer);
    }

    // Upload direto do buffer para o servidor FTP
    await client.uploadFrom(Readable.from(fileBuffer), pathFTP);

    return pathFTP;
  } catch (error) {
    console.error('Erro no upload FTP:', error);
    throw error;
  } finally {
    client.close();
  }
};
