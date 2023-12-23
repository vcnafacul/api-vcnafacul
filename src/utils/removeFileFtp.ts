import * as ftp from 'basic-ftp';

export const removeFileFTP = async (
  filename: string,
  FTP_HOST: string,
  FTP_USER: string,
  FTP_PASSWORD: string,
): Promise<boolean> => {
  const client = new ftp.Client(30000);
  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
    });

    const ftpResponse = await client.remove(filename);
    if (ftpResponse.code == 250) {
      return true;
    }
    return false;
  } catch (error) {
    throw error;
  } finally {
    client.close();
  }
};
