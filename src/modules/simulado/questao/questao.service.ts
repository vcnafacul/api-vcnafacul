import { HttpService } from '@nestjs/axios';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { Status } from '../enum/status.enum';
import { catchError, map } from 'rxjs';
import { UpdateDTOInput } from '../dtos/update-questao.dto.input';
import { CreateQuestaoDTOInput } from '../dtos/create-questao.dto.input';
import { User } from 'src/modules/user/user.entity';
import { AxiosError } from 'axios';

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

  public async getAllQuestoes(status: Status) {
    return await this.http
      .get(`v1/questao/${status}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          throw new ForbiddenException(err.responde.data.message);
        }),
      );
  }

  public async questoesInfo() {
    return await this.http
      .get(`v1/questao/infos`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          throw new ForbiddenException(err.responde.data.message);
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
        catchError((err) => {
          throw new ForbiddenException(err.responde.data.message);
        }),
      );
  }

  public async uploadImage(file: any): Promise<string> {
    if (!file) {
      throw new Error('Nenhum arquivo fornecido');
    }
    return file.filename.split('.')[0];
  }
}
