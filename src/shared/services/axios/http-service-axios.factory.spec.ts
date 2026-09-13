import { Logger } from '@nestjs/common';
import { HttpServiceAxios } from './http-service-axios.factory';

// O construtor real é `(baseURL: string, logger: Logger)`, e `axiosInstance`
// é `private readonly` — sobrescrever por `as any` funciona em runtime, que é
// o que o teste precisa.
function montar(respostaAxios: unknown) {
  const servico = new HttpServiceAxios('http://ms.local', new Logger('teste'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (servico as any).axiosInstance = {
    post: jest.fn().mockResolvedValue(respostaAxios),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { servico, post: (servico as any).axiosInstance.post };
}

describe('postBinary', () => {
  const resposta = {
    data: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    headers: {
      'content-type': 'application/zip',
      'X-Caderno-Avisos': '2',
    },
  };

  it('devolve o buffer e o content-type', async () => {
    const { servico } = montar(resposta);

    const r = await servico.postBinary('v1/caderno/abc', { logos: {} });

    expect(r.buffer).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(r.contentType).toBe('application/zip');
  });

  // ⚠️ Mesma razão do getBinary: em AxiosHeaders o acesso por índice é
  // case-sensitive, e header que não passa não dá erro — ele some.
  it('normaliza os headers para minúsculas', async () => {
    const { servico } = montar(resposta);

    const r = await servico.postBinary('v1/caderno/abc', { logos: {} });

    expect(r.headers['x-caderno-avisos']).toBe('2');
  });

  it('manda o corpo e pede arraybuffer', async () => {
    const { servico, post } = montar(resposta);
    const corpo = { logos: { vnf: 'AAA=' } };

    await servico.postBinary('v1/caderno/abc', corpo);

    expect(post).toHaveBeenCalledWith(
      'http://ms.local/v1/caderno/abc',
      corpo,
      expect.objectContaining({ responseType: 'arraybuffer' }),
    );
  });

  it('sem content-type, cai no octet-stream', async () => {
    const { servico } = montar({ data: Buffer.from([0x50]), headers: {} });

    const r = await servico.postBinary('v1/caderno/abc', {});

    expect(r.contentType).toBe('application/octet-stream');
  });
});
