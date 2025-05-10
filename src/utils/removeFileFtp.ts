import * as ftp from 'basic-ftp';

export const removeFileFTP = async (
  filename: string,
  FTP_HOST: string,
  FTP_USER: string,
  FTP_PASSWORD: string,
  ftpClient: ftp.Client = new ftp.Client(30000), // 👈 injetável
): Promise<boolean> => {
  try {
    await ftpClient.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
    });

    const ftpResponse = await ftpClient.remove(filename);
    if (ftpResponse.code === 250) {
      return true;
    }
    return false;
  } catch (error) {
    throw error;
  } finally {
    ftpClient.close();
  }
};
