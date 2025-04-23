import { compressImage } from '../../src/utils/compressImage';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';
import { Readable } from 'stream';

jest.mock('basic-ftp');
jest.mock('../../src/utils/compressImage.ts', () => ({
  compressImage: jest.fn(),
}));

describe('uploadFileFTP', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      access: jest.fn(),
      ensureDir: jest.fn(),
      uploadFrom: jest.fn(),
      close: jest.fn(),
    };

    jest.clearAllMocks();
  });

  const fakeFile = (name: string, buffer = Buffer.from('file content')) =>
    ({
      originalname: name,
      buffer,
    }) as Express.Multer.File;

  it('faz upload de imagem com compressão', async () => {
    const bufferCompressed = Buffer.from('compressed content');
    (compressImage as jest.Mock).mockResolvedValue(bufferCompressed);

    const result = await uploadFileFTP(
      fakeFile('image.jpg'),
      'localhost',
      'user',
      'pass',
      '',
      mockClient,
    );

    expect(mockClient.access).toHaveBeenCalled();
    expect(compressImage).toHaveBeenCalled();
    expect(mockClient.uploadFrom).toHaveBeenCalledWith(
      expect.any(Readable),
      expect.stringMatching(/\.jpg$/),
    );
    expect(result).toMatch(/\.jpg$/);
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('faz upload de PDF sem compressão', async () => {
    const result = await uploadFileFTP(
      fakeFile('document.pdf'),
      'localhost',
      'user',
      'pass',
      '',
      mockClient,
    );

    expect(compressImage).not.toHaveBeenCalled();
    expect(mockClient.uploadFrom).toHaveBeenCalled();
    expect(result).toMatch(/\.pdf$/);
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('faz upload com diretório personalizado', async () => {
    const result = await uploadFileFTP(
      fakeFile('file.png'),
      'localhost',
      'user',
      'pass',
      'uploads',
      mockClient,
    );

    expect(mockClient.ensureDir).toHaveBeenCalledWith('uploads');
    expect(result).toMatch(/\/uploads\/.*\.png$/);
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('trata erro no upload e fecha conexão', async () => {
    mockClient.uploadFrom.mockRejectedValueOnce(new Error('FTP falhou'));

    await expect(
      uploadFileFTP(
        fakeFile('file.jpg'),
        'localhost',
        'user',
        'pass',
        '',
        mockClient,
      ),
    ).rejects.toThrow('FTP falhou');

    expect(mockClient.close).toHaveBeenCalled();
  });
});
