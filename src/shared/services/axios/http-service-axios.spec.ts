import { HttpException, Logger } from '@nestjs/common';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from './http-service-axios.factory';

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => mockAxiosInstance) },
}));

describe('HttpServiceAxios', () => {
  let service: HttpServiceAxios;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HttpServiceAxios('http://localhost:3000', new Logger());
  });

  describe('getFullURL', () => {
    it('should build full URL correctly', () => {
      expect(service.getFullURL('v1/test')).toBe(
        'http://localhost:3000/v1/test',
      );
    });

    it('should remove trailing slash from baseURL', () => {
      const s = new HttpServiceAxios('http://localhost:3000/', new Logger());
      expect(s.getFullURL('v1/test')).toBe('http://localhost:3000/v1/test');
    });

    it('should remove leading slash from path', () => {
      expect(service.getFullURL('/v1/test')).toBe(
        'http://localhost:3000/v1/test',
      );
    });
  });

  describe('getBaseURL', () => {
    it('should return the baseURL', () => {
      expect(service.getBaseURL()).toBe('http://localhost:3000');
    });
  });

  describe('get', () => {
    it('should call axios get and return data', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 1 } });

      const result = await service.get('v1/items');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items',
        undefined,
      );
      expect(result).toEqual({ id: 1 });
    });

    it('should handle error with response data', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { data: { message: 'Not Found', status: 404 }, status: 404 },
      });

      await expect(service.get('v1/missing')).rejects.toThrow(HttpException);
      await expect(service.get('v1/missing')).rejects.toMatchObject({
        response: { message: 'Not Found', status: 404 },
      });
    });

    it('should throw fallback error when no response data', async () => {
      mockAxiosInstance.get.mockRejectedValue({ code: 'ECONNREFUSED' });

      await expect(service.get('v1/items')).rejects.toThrow(HttpException);
      await expect(service.get('v1/items')).rejects.toMatchObject({
        response: {
          message: 'Erro desconhecido ou serviço indisponível.',
          status: 'ECONNREFUSED',
        },
      });
    });
  });

  describe('post', () => {
    it('should call axios post with body and return data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 2 } });

      const result = await service.post('v1/items', { name: 'test' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items',
        { name: 'test' },
        undefined,
      );
      expect(result).toEqual({ id: 2 });
    });
  });

  describe('patch', () => {
    it('should call axios patch with body and return data', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: { updated: true } });

      const result = await service.patch('v1/items/1', { name: 'updated' });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items/1',
        { name: 'updated' },
        undefined,
      );
      expect(result).toEqual({ updated: true });
    });
  });

  describe('delete', () => {
    it('should call axios delete and return data', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      const result = await service.delete('v1/items/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items/1',
        undefined,
      );
      expect(result).toBeNull();
    });
  });

  describe('put', () => {
    it('should call axios put with body and return data', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { replaced: true } });

      const result = await service.put('v1/items/1', { name: 'new' });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items/1',
        { name: 'new' },
        undefined,
      );
      expect(result).toEqual({ replaced: true });
    });
  });

  describe('getBinary', () => {
    it('busca arraybuffer e devolve {buffer, contentType}', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: Buffer.from('PDF'),
        headers: { 'content-type': 'application/pdf' },
      });

      const r = await service.getBinary('v1/cartao-resposta/1');

      expect(r.contentType).toBe('application/pdf');
      expect(r.buffer.toString()).toBe('PDF');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'http://localhost:3000/v1/cartao-resposta/1',
        { responseType: 'arraybuffer', headers: undefined },
      );
    });
  });
});

function capturarHttpException(erro: any): HttpException {
  const service = new HttpServiceAxios('http://localhost:3000', new Logger());
  try {
    // handleError é privado e síncrono (nunca retorna, sempre lança) — chamar
    // direto evita ter que passar pelo round-trip assíncrono de `get`.
    (service as any).handleError(erro);
  } catch (ex) {
    return ex as HttpException;
  }
  throw new Error('handleError deveria ter lançado uma HttpException');
}

function montarComRespostaBinaria(response: {
  data: Buffer;
  headers: Record<string, string>;
}) {
  mockAxiosInstance.get.mockResolvedValueOnce(response);
  const service = new HttpServiceAxios('http://localhost:3000', new Logger());
  return { service };
}

describe('handleError — corpo de erro binário', () => {
  // Com `responseType: 'arraybuffer'`, o corpo de erro chega como Buffer.
  // Sem desembrulhar, o ControllerExceptionsFilter o trata como objeto puro e
  // ESPALHA: o 409 sai com 81 chaves começando em "0","1","2" e a mensagem
  // vira {"type":"Buffer","data":[...]}. Medido.
  const erroBinario = (corpo: Buffer | string, status: number) => ({
    isAxiosError: true,
    response: { status, data: corpo },
  });

  it('Buffer com JSON válido volta a ser objeto, com a mensagem', () => {
    const corpo = Buffer.from(
      JSON.stringify({
        message: 'simulado não está pronto (questões pendentes ou incompletas)',
        statusCode: 409,
      }),
    );
    const ex = capturarHttpException(erroBinario(corpo, 409));
    expect(ex.getStatus()).toBe(409);
    expect(ex.getResponse()).toEqual({
      message: 'simulado não está pronto (questões pendentes ou incompletas)',
      statusCode: 409,
    });
  });

  it('Buffer com texto que não é JSON vira message, sem lançar', () => {
    // O ms não é a única coisa que responde: um proxy reverso ou um
    // balanceador no meio devolve HTML. Um JSON.parse solto lançaria de
    // DENTRO do tratamento de erro, trocando um 409 legível por um 500 sem
    // causa aparente.
    const ex = capturarHttpException(
      erroBinario(
        Buffer.from('<html><body>502 Bad Gateway</body></html>'),
        502,
      ),
    );
    expect(ex.getStatus()).toBe(502);
    expect((ex.getResponse() as any).message).toContain('502 Bad Gateway');
  });

  it('Buffer com bytes que não são texto vira mensagem genérica', () => {
    // Decodificar binário como utf-8 produz U+FFFD. Deixar passar poria
    // "����" na tela do usuário.
    const ex = capturarHttpException(
      erroBinario(Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x81]), 500),
    );
    const corpo = ex.getResponse() as any;
    expect(corpo.message).toBe('erro no serviço de simulados');
    expect(JSON.stringify(corpo)).not.toContain('�');
  });

  it('trunca corpo enorme em vez de despejar a página inteira', () => {
    // O card 06 mostra isto num toast.
    const ex = capturarHttpException(
      erroBinario(Buffer.from('x'.repeat(5000)), 502),
    );
    expect((ex.getResponse() as any).message.length).toBeLessThanOrEqual(320);
  });

  it('Buffer vazio vira mensagem genérica', () => {
    const ex = capturarHttpException(erroBinario(Buffer.alloc(0), 500));
    expect((ex.getResponse() as any).message).toBe(
      'erro no serviço de simulados',
    );
  });

  it('corpo NÃO binário continua exatamente como hoje', () => {
    // Regressão: é o caminho de todo o resto da api.
    const ex = capturarHttpException(
      erroBinario(
        { message: 'categoria em uso', simuladosUsando: 3 } as any,
        409,
      ),
    );
    expect(ex.getResponse()).toEqual({
      message: 'categoria em uso',
      simuladosUsando: 3,
    });
  });

  it('sem response (timeout, DNS) continua 500 genérico', () => {
    const ex = capturarHttpException({
      isAxiosError: true,
      code: 'ECONNREFUSED',
    });
    expect(ex.getStatus()).toBe(500);
  });
});

describe('getBinary — headers', () => {
  it('devolve os headers junto do buffer e do contentType', async () => {
    const { service } = montarComRespostaBinaria({
      data: Buffer.from('ZIP'),
      headers: { 'content-type': 'application/zip', 'x-caderno-avisos': '3' },
    });
    const r = await service.getBinary('v1/caderno/abc');
    expect(r.buffer).toEqual(Buffer.from('ZIP'));
    expect(r.contentType).toBe('application/zip');
    expect(r.headers['x-caderno-avisos']).toBe('3');
  });

  it('normaliza o nome do header para minúsculas', async () => {
    // ⚠️ MEDIDO: em `AxiosHeaders`, acesso por índice é case-SENSITIVE —
    // `h['x-caderno-avisos']` devolve undefined quando o header chegou como
    // `X-Caderno-Avisos`. E header que não passa não dá erro: ele some.
    const { service } = montarComRespostaBinaria({
      data: Buffer.from('ZIP'),
      headers: { 'Content-Type': 'application/zip', 'X-Caderno-Avisos': '7' },
    });
    const r = await service.getBinary('v1/caderno/abc');
    expect(r.headers['x-caderno-avisos']).toBe('7');
  });

  it('sem o header, a chave simplesmente não existe', async () => {
    const { service } = montarComRespostaBinaria({
      data: Buffer.from('ZIP'),
      headers: { 'content-type': 'application/zip' },
    });
    const r = await service.getBinary('v1/caderno/abc');
    expect(r.headers['x-caderno-avisos']).toBeUndefined();
  });
});

describe('HttpServiceAxiosFactory', () => {
  it('should create an HttpServiceAxios instance', () => {
    const factory = new HttpServiceAxiosFactory({} as any);
    const instance = factory.create('http://localhost:3000');
    expect(instance).toBeInstanceOf(HttpServiceAxios);
    expect(instance.getBaseURL()).toBe('http://localhost:3000');
  });
});
