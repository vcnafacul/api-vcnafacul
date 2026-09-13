import { CadernoHttpService } from './caderno-http.service';

const montar = () => {
  const axios = {
    postBinary: jest.fn().mockResolvedValue({
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
    const r = await service.baixar('65ecc850a528b39d273e7900', false, {});
    expect(axios.postBinary).toHaveBeenCalledWith(
      'v1/caderno/65ecc850a528b39d273e7900',
      { logos: {} },
    );
    expect(r.buffer).toEqual(Buffer.from('ZIP'));
    expect(r.avisos).toBe('3');
  });

  it('draft=true vira o literal ?draft=true', async () => {
    const { service, axios } = montar();
    await service.baixar('65ecc850a528b39d273e7900', true, {});
    expect(axios.postBinary).toHaveBeenCalledWith(
      'v1/caderno/65ecc850a528b39d273e7900?draft=true',
      { logos: {} },
    );
  });

  it('sem avisos, devolve undefined em vez de string vazia', async () => {
    const { service, axios } = montar();
    axios.postBinary.mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      headers: {},
    });
    const r = await service.baixar('65ecc850a528b39d273e7900', false, {});
    expect(r.avisos).toBeUndefined();
  });

  describe('baixar — logos no corpo', () => {
    const PNG_VNF = Buffer.from([0x89, 0x50]);
    const PNG_CURSINHO = Buffer.from([0x89, 0x51]);

    it('manda os logos em base64, sob chaves semânticas', async () => {
      const { service, axios } = montar();

      await service.baixar('65ecc850a528b39d273e7900', false, {
        vnf: PNG_VNF,
        cursinho: PNG_CURSINHO,
      });

      expect(axios.postBinary).toHaveBeenCalledWith(
        'v1/caderno/65ecc850a528b39d273e7900',
        {
          logos: {
            vnf: PNG_VNF.toString('base64'),
            cursinho: PNG_CURSINHO.toString('base64'),
          },
        },
      );
    });

    // ⚠️ O ms-simulado tolera `null`, mas o contrato é OMITIR. Mandar `null`
    // funcionaria hoje e é o tipo de divergência que ninguém revisa depois.
    it('omite a chave do logo ausente em vez de mandar null', async () => {
      const { service, axios } = montar();

      await service.baixar('65ecc850a528b39d273e7900', false, { vnf: PNG_VNF });

      const corpo = axios.postBinary.mock.calls[0][1];
      expect(corpo.logos).toEqual({ vnf: PNG_VNF.toString('base64') });
      expect('cursinho' in corpo.logos).toBe(false);
    });

    it('draft e logos convivem', async () => {
      const { service, axios } = montar();

      await service.baixar('65ecc850a528b39d273e7900', true, { vnf: PNG_VNF });

      expect(axios.postBinary).toHaveBeenCalledWith(
        'v1/caderno/65ecc850a528b39d273e7900?draft=true',
        { logos: { vnf: PNG_VNF.toString('base64') } },
      );
    });
  });
});
