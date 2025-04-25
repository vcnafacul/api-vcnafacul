/* istanbul ignore file */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { Observable, catchError, map, throwError } from 'rxjs';

@Injectable()
export class HttpServiceAxios {
  constructor(private readonly http: HttpService) {}

  private readonly logger = new Logger(HttpServiceAxios.name);

  public setBaseURL(baseURL: string) {
    this.http.axiosRef.defaults.baseURL = baseURL;
  }

  private handleError(error: any): Observable<never> {
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

    return throwError(() => errorData);
  }

  private requestWrapper<T>(request: Observable<any>): Observable<T> {
    return request.pipe(
      map((res) => res.data),
      catchError((error) => this.handleError(error)),
    );
  }

  public get<T>(url: string): Observable<T> {
    return this.requestWrapper<T>(this.http.get<T>(url));
  }

  public post<T>(url: string, body: any): Observable<T> {
    return this.requestWrapper<T>(this.http.post<T>(url, body));
  }

  public patch<T>(url: string, body?: any): Observable<T> {
    return this.requestWrapper<T>(this.http.patch<T>(url, body));
  }

  public delete<T>(url: string): Observable<T> {
    return this.requestWrapper<T>(this.http.delete<T>(url));
  }
}
