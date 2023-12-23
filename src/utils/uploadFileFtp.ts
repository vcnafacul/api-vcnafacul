import * as fs from 'fs';
import * as ftp from 'basic-ftp';

export const uploadFileFTP = async (
  file: any,
  FTP_TEMP_FILE: string,
  FTP_HOST: string,
  FTP_USER: string,
  FTP_PASSWORD: string,
): Promise<string> => {
  const client = new ftp.Client(30000);
  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
    });
    const typeFile = file.originalname.split('.')[1];
    const nameFile = Date.now();
    const tempFilePath = `${FTP_TEMP_FILE}${nameFile}.${typeFile}`;

    fs.writeFileSync(tempFilePath, file.buffer);

    const ftpResponse = await client.uploadFrom(
      tempFilePath,
      `${nameFile}.${typeFile}`,
    );
    fs.unlinkSync(tempFilePath);
    if (ftpResponse.code == 226) {
      return `${nameFile}.${typeFile}`;
    }
    return '';
  } catch (error) {
    throw error;
  } finally {
    client.close();
  }
};
