/* istanbul ignore file */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, map } from 'rxjs';

@Injectable()
export class HttpServiceAxios {
  private readonly logger = new Logger(HttpServiceAxios.name);

  constructor(private readonly http: HttpService) {}

  public setBaseURL(baseURL: string) {
    this.http.axiosRef.defaults.baseURL = baseURL;
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

  private async observableRequest<T>(observable): Promise<T> {
    return this.requestWrapper(
      firstValueFrom(
        observable.pipe(
          map((res: any) => res.data),
          catchError((error) => {
            throw this.handleError(error);
          }),
        ),
      ),
    );
  }

  public async get<T>(url: string): Promise<T> {
    return this.observableRequest<T>(this.http.get<T>(url));
  }

  public async post<T>(url: string, body: any): Promise<T> {
    return this.observableRequest<T>(this.http.post<T>(url, body));
  }

  public async patch<T>(url: string, body?: any): Promise<T> {
    return this.observableRequest<T>(this.http.patch<T>(url, body));
  }

  public async delete<T>(url: string): Promise<T> {
    return this.observableRequest<T>(this.http.delete<T>(url));
  }
}
