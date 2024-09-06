import * as ftp from 'basic-ftp';
import * as fs from 'fs';
import { compressImage } from './compressImage';

export const uploadFileFTP = async (
  file: any,
  FTP_TEMP_FILE: string,
  FTP_HOST: string,
  FTP_CONTENT: string,
  FTP_PASSWORD: string,
  directory: string = '',
): Promise<string> => {
  const client = new ftp.Client(30000);
  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_CONTENT,
      password: FTP_PASSWORD,
    });
    const typeFile = file.originalname.split('.')[1];
    const nameFile = Date.now();
    const tempFilePath = `${FTP_TEMP_FILE}${nameFile}.${typeFile}`;

    // Verifica se o diretório de destino existe no servidor FTP
    let pathFTP = `${nameFile}.${typeFile}`;
    if (directory) {
      await client.ensureDir(directory);
      pathFTP = `/${directory}/${pathFTP}`;
    }

    if (['jpg', 'jpeg', 'png'].includes(typeFile)) {
      await compressImage(tempFilePath, file.buffer);
    } else {
      fs.writeFileSync(tempFilePath, file.buffer);
    }

    const ftpResponse = await client.uploadFrom(tempFilePath, pathFTP);
    fs.unlinkSync(tempFilePath);
    if (ftpResponse.code == 226) {
      return pathFTP;
    }
    return '';
  } catch (error) {
    throw error;
  } finally {
    client.close();
  }
};
