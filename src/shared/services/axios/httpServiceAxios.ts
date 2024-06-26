import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { Observable, catchError, map } from 'rxjs';

@Injectable()
export class HttpServiceAxios {
  constructor(private readonly http: HttpService) {}

  public async setBaseURL(baseURL: string) {
    this.http.axiosRef.defaults.baseURL = baseURL;
  }

  public async get<T>(url: string): Promise<Observable<T>> {
    try {
      return this.http
        .get<T>(url)
        .pipe(
          catchError((error: AxiosError) => {
            console.log(error.response.data);
            throw error.response?.data;
          }),
        )
        .pipe(map((res) => res.data));
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  public async postR<T>(url: string, req: any): Promise<Observable<T>> {
    try {
      return this.http
        .post<T>(url, req)
        .pipe(map((res) => res.data))
        .pipe(
          catchError((error: AxiosError) => {
            throw error.response?.data;
          }),
        );
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  public async post<T>(url: string, req: any) {
    try {
      this.http
        .post<T>(url, req)
        .pipe(
          catchError((error: AxiosError) => {
            throw error.response?.data;
          }),
        )
        .subscribe();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  public async delete<T>(url: string) {
    try {
      this.http.delete<T>(url).pipe(
        catchError((error: AxiosError) => {
          throw error.response?.data;
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  public async patch<T>(url: string, req?: any) {
    try {
      return this.http
        .patch<T>(url, req)
        .pipe(map((res) => res.data))
        .pipe(
          catchError((error: AxiosError) => {
            throw error.response?.data;
          }),
        );
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
