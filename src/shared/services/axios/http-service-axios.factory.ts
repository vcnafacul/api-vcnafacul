import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';

@Injectable()
export class HttpServiceAxiosFactory {
  private readonly logger = new Logger(HttpServiceAxiosFactory.name);

  constructor(private readonly httpService: HttpService) {}

  create(baseURL: string): HttpServiceAxios {
    return new HttpServiceAxios(baseURL, this.logger);
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
      axiosError?.response?.data ||
      ({
        message: 'Erro desconhecido ou serviço indisponível.',
        status: axiosError?.code || 500,
      } as any);

    this.logger.error({
      message: errorData?.message || errorData,
      status: errorData?.status || 'SEM STATUS',
      stack: axiosError?.stack,
    });

    throw errorData;
  }

  private async requestWrapper<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (error) {
      this.handleError(error);
    }
  }

  public async get<T>(url: string): Promise<T> {
    // Construir URL completa manualmente para garantir que não há interferência
    const fullURL = this.getFullURL(url);

    // Usar URL completa em vez de baseURL + url para evitar interferência
    return this.requestWrapper(
      this.axiosInstance.get<T>(fullURL).then((response) => response.data),
    );
  }

  public async post<T>(url: string, body: any): Promise<T> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .post<T>(fullURL, body)
        .then((response) => response.data),
    );
  }

  public async patch<T>(url: string, body?: any): Promise<T> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .patch<T>(fullURL, body)
        .then((response) => response.data),
    );
  }

  public async delete<T>(url: string): Promise<T> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance.delete<T>(fullURL).then((response) => response.data),
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
}
