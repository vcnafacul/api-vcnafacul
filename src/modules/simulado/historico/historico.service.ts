import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, map } from 'rxjs';
import { GetHistoricoDTOInput } from '../dtos/get-historico.dto';

@Injectable()
export class HistoricoService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.http.axiosRef.defaults.baseURL =
      this.configService.get<string>('SIMULADO_URL');
  }
  async getAllByUser(query: GetHistoricoDTOInput, userId: number) {
    let baseUrl = 'v1/historico?';

    Object.keys(query).forEach((key) => {
      baseUrl = baseUrl + `${key}=${query[key]}&`;
    });

    baseUrl += `userId=${userId}`;
    return this.http
      .get(baseUrl)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err: AxiosError) => {
          console.log(err.response);
          throw err.response;
        }),
      );
  }

  async getById(id: string) {
    return this.http
      .get(`v1/historico/${id}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err: AxiosError) => {
          throw err.response.data;
        }),
      );
  }

  async getPerformance(userId: number) {
    return this.http
      .get(`v1/historico/performance/${userId}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err: AxiosError) => {
          throw err.response.data;
        }),
      );
  }
}
