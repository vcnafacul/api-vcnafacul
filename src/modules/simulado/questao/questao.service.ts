import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, map } from 'rxjs';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { User } from 'src/modules/user/user.entity';
import { CreateQuestaoDTOInput } from '../dtos/create-questao.dto.input';
import { QuestaoDTOInput } from '../dtos/questao.dto.input';
import { UpdateDTOInput } from '../dtos/update-questao.dto.input';
import { Status } from '../enum/status.enum';

@Injectable()
export class QuestaoService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly auditLod: AuditLogService,
  ) {
    this.http.axiosRef.defaults.baseURL =
      this.configService.get<string>('SIMULADO_URL');
  }

  public async getAllQuestoes(query: QuestaoDTOInput) {
    let baseUrl = 'v1/questao?';

    Object.keys(query).forEach((key) => {
      baseUrl = baseUrl + `${key}=${query[key]}&`;
    });

    return await this.http
      .get(baseUrl)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  public async questoesInfo() {
    return await this.http
      .get(`v1/questao/infos`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  public async questoesUpdateStatus(
    id: string,
    status: Status,
    user: User,
    message?: string,
  ) {
    return await this.http
      .patch(`v1/questao/${id}/${status}`, {
        message,
        userId: user.id,
      })
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  public async questoesUpdate(questao: UpdateDTOInput) {
    return await this.http
      .patch(`v1/questao`, questao)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  public async createQuestion(questao: CreateQuestaoDTOInput) {
    return await this.http
      .post(`v1/questao`, questao)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  public async uploadImage(file: any): Promise<string> {
    if (!file) {
      throw new Error('Nenhum arquivo fornecido');
    }
    return file.filename.split('.')[0];
  }

  public async delete(id: string) {
    return await this.http
      .delete(`v1/questao/${id}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }
}
