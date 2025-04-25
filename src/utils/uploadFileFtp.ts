import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import { compressImage } from './compressImage';

export const uploadFileFTP = async (
  file: Express.Multer.File,
  FTP_HOST: string,
  FTP_USER: string,
  FTP_PASSWORD: string,
  directory: string = '',
  ftpClient: ftp.Client = new ftp.Client(30000), // << aqui!
): Promise<string> => {
  try {
    await ftpClient.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
    });

    const typeFile = file.originalname.split('.').pop()?.toLowerCase();
    const nameFile = `${Date.now()}.${typeFile}`;

    let pathFTP = nameFile;
    if (directory) {
      await ftpClient.ensureDir(directory);
      pathFTP = `/${directory}/${pathFTP}`;
    }

    let fileBuffer = file.buffer;
    if (['jpg', 'jpeg', 'png'].includes(typeFile)) {
      fileBuffer = await compressImage(fileBuffer);
    }

    await ftpClient.uploadFrom(Readable.from(fileBuffer), pathFTP);

    return pathFTP;
  } catch (error) {
    throw error;
  } finally {
    ftpClient.close();
  }
};
