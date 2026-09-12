import { CadernoHttpService } from './caderno-http.service';

const montar = () => {
  const axios = {
    getBinary: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      headers: { 'x-caderno-avisos': '3' },
    }),
  };
  const factory = { create: jest.fn().mockReturnValue(axios) };
  const env = { get: jest.fn().mockReturnValue('http://ms:3000') };
  return {
    service: new CadernoHttpService(factory as any, env as any),
    axios,
  };
};

describe('CadernoHttpService', () => {
  it('chama a rota do caderno no ms', async () => {
    const { service, axios } = montar();
    const r = await service.baixar('65ecc850a528b39d273e7900', false);
    expect(axios.getBinary).toHaveBeenCalledWith(
      'v1/caderno/65ecc850a528b39d273e7900',
    );
    expect(r.buffer).toEqual(Buffer.from('ZIP'));
    expect(r.avisos).toBe('3');
  });

  it('draft=true vira o literal ?draft=true', async () => {
    const { service, axios } = montar();
    await service.baixar('65ecc850a528b39d273e7900', true);
    expect(axios.getBinary).toHaveBeenCalledWith(
      'v1/caderno/65ecc850a528b39d273e7900?draft=true',
    );
  });

  it('sem avisos, devolve undefined em vez de string vazia', async () => {
    const { service, axios } = montar();
    axios.getBinary.mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      headers: {},
    });
    const r = await service.baixar('65ecc850a528b39d273e7900', false);
    expect(r.avisos).toBeUndefined();
  });
});
