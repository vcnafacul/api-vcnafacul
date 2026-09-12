import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';

@Injectable()
export class HttpServiceAxiosFactory {
  private readonly logger = new Logger(HttpServiceAxiosFactory.name);

  constructor(private readonly httpService: HttpService) {}

  create(baseURL: string): HttpServiceAxios {
    return new HttpServiceAxios(baseURL, this.logger);
  }
}

/**
 * Quanto de um corpo de erro em texto vira `message`.
 *
 * O card 06 mostra isso num toast: despejar uma página de erro de proxy
 * reverso inteira ali é pior do que truncar.
 */
const LIMITE_MENSAGEM = 300;

/**
 * Desembrulha o corpo de erro de uma resposta binária.
 *
 * ⚠️ Com `responseType: 'arraybuffer'`, o corpo de erro chega como `Buffer`,
 * não como objeto. Repassado cru, o `ControllerExceptionsFilter` o trata como
 * objeto puro e o **espalha**: o 409 sai com 81 chaves começando em
 * `"0","1","2"`, e a mensagem vira `{"type":"Buffer","data":[...]}`. Medido.
 *
 * ⚠️ Os três ramos existem porque **o ms não é a única coisa que responde**.
 * Um proxy reverso devolve HTML, e um `JSON.parse` solto lançaria de dentro do
 * tratamento de erro — trocando um 409 legível por um 500 sem causa aparente.
 */
function desembrulharCorpo(data: unknown): unknown {
  if (!Buffer.isBuffer(data)) return data;

  const texto = data.toString('utf-8');
  try {
    return JSON.parse(texto);
  } catch {
    // Não é JSON. `U+FFFD` é o que sobra de bytes que não eram texto —
    // deixar passar poria "����" na tela do usuário.
    const ehTexto = texto.trim().length > 0 && !texto.includes('�');
    return ehTexto
      ? { message: texto.slice(0, LIMITE_MENSAGEM) }
      : { message: 'erro no serviço de simulados' };
  }
}

export class HttpServiceAxios {
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly baseURL: string,
    private readonly logger: Logger,
  ) {
    // Cria uma instância Axios completamente separada
    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: 30000,
      maxRedirects: 3,
    });
  }

  private handleError(error: any): never {
    const axiosError = error as AxiosError;

    const errorData =
      desembrulharCorpo(axiosError?.response?.data) ||
      ({
        message: 'Erro desconhecido ou serviço indisponível.',
        status: axiosError?.code || 500,
      } as any);

    this.logger.error({
      message: errorData?.message || errorData,
      status: errorData?.status || 'SEM STATUS',
      stack: axiosError?.stack,
    });

    throw new HttpException(errorData, axiosError?.response?.status ?? 500);
  }

  private async requestWrapper<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (error) {
      this.handleError(error);
    }
  }

  public async get<T>(
    url: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    // Construir URL completa manualmente para garantir que não há interferência
    const fullURL = this.getFullURL(url);

    // Usar URL completa em vez de baseURL + url para evitar interferência
    return this.requestWrapper(
      this.axiosInstance
        .get<T>(fullURL, headers ? { headers } : undefined)
        .then((response) => response.data),
    );
  }

  public async post<T>(
    url: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .post<T>(fullURL, body, headers ? { headers } : undefined)
        .then((response) => response.data),
    );
  }

  public async patch<T>(
    url: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .patch<T>(fullURL, body, headers ? { headers } : undefined)
        .then((response) => response.data),
    );
  }

  public async delete<T>(
    url: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .delete<T>(fullURL, headers ? { headers } : undefined)
        .then((response) => response.data),
    );
  }

  public async getBinary(
    url: string,
    headers?: Record<string, string>,
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    headers: Record<string, string>;
  }> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .get(fullURL, { responseType: 'arraybuffer', headers })
        .then((response) => ({
          buffer: Buffer.from(response.data),
          contentType:
            (response.headers['content-type'] as string) ??
            'application/octet-stream',
          // ⚠️ Minúsculas SEMPRE. Em `AxiosHeaders` o acesso por índice é
          // case-sensitive: `h['x-caderno-avisos']` devolve `undefined` se o
          // header chegou como `X-Caderno-Avisos`. E header que não passa não
          // dá erro — ele some, e ninguém descobre.
          headers: Object.fromEntries(
            Object.entries({ ...response.headers }).map(([k, v]) => [
              k.toLowerCase(),
              String(v),
            ]),
          ),
        })),
    );
  }

  // Método para debug - mostra a baseURL configurada
  public getBaseURL(): string {
    return this.baseURL;
  }

  // Método para debug - mostra a URL completa que será chamada
  public getFullURL(url: string): string {
    // Remove barras duplas e constrói URL corretamente
    const cleanBaseURL = this.baseURL.replace(/\/$/, ''); // Remove barra final se existir
    const cleanURL = url.replace(/^\//, ''); // Remove barra inicial se existir
    return `${cleanBaseURL}/${cleanURL}`;
  }

  public async put<T>(
    url: string,
    body: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .put<T>(fullURL, body, headers ? { headers } : undefined)
        .then((response) => response.data),
    );
  }
}
