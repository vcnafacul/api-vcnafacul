import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { Observable, catchError, map } from 'rxjs';

@Injectable()
export class HttpServiceAxios {
  constructor(private readonly http: HttpService) {}

  public async setBaseURL(baseURL: string) {
    this.http.axiosRef.defaults.baseURL = baseURL;
  }

  public async get<T>(url: string): Promise<Observable<T>> {
    return this.http
      .get<T>(url)
      .pipe(
        catchError((error: AxiosError) => {
          console.log(error.response.data);
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
          throw error.response?.data;
        }),
      )
      .subscribe();
  }

  public async delete<T>(url: string) {
    this.http.delete<T>(url).pipe(
      catchError((error: AxiosError) => {
        throw error.response?.data;
      }),
    );
  }

  public async patch<T>(url: string, req?: any) {
    return this.http
      .patch<T>(url, req)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response?.data;
        }),
      );
  }
}
