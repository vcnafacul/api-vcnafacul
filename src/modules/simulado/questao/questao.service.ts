import { HttpService } from '@nestjs/axios';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { Status } from '../enum/status.enum';
import { catchError, map } from 'rxjs';
import { UpdateDTOInput } from '../dtos/update-questao.dto.input';
import { CreateQuestaoDTOInput } from '../dtos/create-questao.dto.input';

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

  public async getAllQuestoes(page: number, limit: number, status: Status) {
    return await this.http
      .get(
        `v1/questao/${status}?page=${page ? page : 1}&limit=${
          limit ? limit : 10
        }`,
      )
      .pipe(
        map((res) => {
          console.log(res);
          return res.data;
        }),
      )
      .pipe(
        catchError((err) => {
          console.log(err.responde);
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
          console.log(err);
          throw new ForbiddenException(err.message);
        }),
      );
  }

  public async questoesUpdateStatus(id: string, status: Status) {
    return await this.http
      .patch(`v1/questao/${id}/${status}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          console.log(err);
          throw new ForbiddenException(err.response.data);
        }),
      );
  }

  public async questoesUpdate(questao: UpdateDTOInput) {
    return await this.http
      .patch(`v1/questao`, questao)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          console.log(err);
          throw new ForbiddenException(err.message);
        }),
      );
  }

  public async createQuestion(questao: CreateQuestaoDTOInput) {
    return await this.http
      .post(`v1/questao`, questao)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          console.log(err);
          throw new ForbiddenException(err.message);
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
