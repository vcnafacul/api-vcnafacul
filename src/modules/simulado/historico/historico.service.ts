import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, map } from 'rxjs';

@Injectable()
export class HistoricoService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.http.axiosRef.defaults.baseURL =
      this.configService.get<string>('SIMULADO_URL');
  }
  async getAllByUser(userId: number) {
    return this.http
      .get(`v1/historico?userId=${userId}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err: AxiosError) => {
          throw err.response.data;
        }),
      );
  }
}
