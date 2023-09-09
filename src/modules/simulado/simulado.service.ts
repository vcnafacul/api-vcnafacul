import { HttpService } from '@nestjs/axios';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateSimuladoDTOInput } from './dtos/create-simulado.dto.input';
import { SimuladoDTO } from './dtos/simulado.dto.output';
import { catchError, map } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SimuladoService {
  constructor(
    private readonly http: HttpService,
    private configService: ConfigService,
  ) {
    this.http.axiosRef.defaults.baseURL =
      this.configService.get<string>('SIMULADO_URL');
  }

  async create(dto: CreateSimuladoDTOInput) {
    return this.http
      .post('v1/simulado', dto)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          console.log(err);
          throw new ForbiddenException('API not available');
        }),
      );
  }

  async getAll() {
    return this.http
      .get<SimuladoDTO[]>('v1/simulado')
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          console.log(err);
          throw new ForbiddenException('API not available');
        }),
      );
  }

  async getDefaults() {
    return this.http
      .get<SimuladoDTO>('v1/simulado/default')
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          console.log(err);
          throw new ForbiddenException('API not available');
        }),
      );
  }

  async getToAnswer(id: string) {
    return this.http
      .get<SimuladoDTO>(`v1/simulado/toanswer/${id}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          console.log(err);
          throw new ForbiddenException('API not available');
        }),
      );
  }

  async getById(id: string) {
    return this.http
      .get<SimuladoDTO>(`v1/simulado/${id}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          console.log(err);
          throw new ForbiddenException('API not available');
        }),
      );
  }

  public async delete(id: string): Promise<void> {
    this.http.delete<SimuladoDTO>(`v1/simulado/${id}`).pipe(
      catchError((err) => {
        console.log(err);
        throw new ForbiddenException('API not available');
      }),
    );
  }
}
