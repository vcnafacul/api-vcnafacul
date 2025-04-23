import { removeFileFTP } from 'src/utils/removeFileFtp';

jest.mock('basic-ftp');

describe('removeFileFTP', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      access: jest.fn(),
      remove: jest.fn(),
      close: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('deve retornar true quando ftp retorna código 250', async () => {
    mockClient.remove.mockResolvedValueOnce({ code: 250 });

    const result = await removeFileFTP(
      'teste.jpg',
      'localhost',
      'user',
      'pass',
      mockClient,
    );

    expect(mockClient.access).toHaveBeenCalled();
    expect(mockClient.remove).toHaveBeenCalledWith('teste.jpg');
    expect(result).toBe(true);
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('deve retornar false quando ftp retorna código diferente de 250', async () => {
    mockClient.remove.mockResolvedValueOnce({ code: 550 });

    const result = await removeFileFTP(
      'arquivo.jpg',
      'localhost',
      'user',
      'pass',
      mockClient,
    );

    expect(result).toBe(false);
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('deve lançar erro e fechar conexão se der erro', async () => {
    mockClient.remove.mockRejectedValueOnce(new Error('erro FTP'));

    await expect(
      removeFileFTP('erro.jpg', 'localhost', 'user', 'pass', mockClient),
    ).rejects.toThrow('erro FTP');

    expect(mockClient.close).toHaveBeenCalled();
  });
});
