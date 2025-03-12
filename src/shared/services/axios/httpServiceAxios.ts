import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { Observable, catchError, firstValueFrom, map } from 'rxjs';

@Injectable()
export class HttpServiceAxios {
  constructor(private readonly http: HttpService) {}

  public async setBaseURL(baseURL: string) {
    this.http.axiosRef.defaults.baseURL = baseURL;
  }

  private readonly logger = new Logger(HttpServiceAxios.name);

  public async get<T>(url: string): Promise<Observable<T>> {
    return this.http
      .get<T>(url)
      .pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error.response?.data;
        }),
      )
      .pipe(map((res) => res.data));
  }

  public async postR<T>(url: string, req: any): Promise<Observable<T>> {
    return this.http
      .post<T>(url, req)
      .pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error.response?.data;
        }),
      )
      .pipe(map((res) => res.data));
  }

  public async post<T>(url: string, req: any) {
    this.http
      .post<T>(url, req)
      .pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error.response?.data;
        }),
      )
      .subscribe();
  }

  public async delete<T>(url: string) {
    try {
      return await firstValueFrom(
        this.http.delete<T>(url).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw error.response?.data;
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  public async patch<T>(url: string, req?: any) {
    return this.http
      .patch<T>(url, req)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error.response?.data;
        }),
      );
  }
}
