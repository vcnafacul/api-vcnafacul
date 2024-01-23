import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { CreateSimuladoDTOInput } from './dtos/create-simulado.dto.input';
import { SimuladoDTO } from './dtos/simulado.dto.output';
import { catchError, map } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AnswerSimulado } from './dtos/answer-simulado.dto.input';
import { ReportDTO } from './dtos/report.dto.input';
import { ReportEntity } from './enum/report.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Status } from './enum/status.enum';
import { UpdateDTOInput } from './dtos/update-questao.dto.input';
import { CreateQuestaoDTOInput } from './dtos/create-questao.dto.input';
import { TipoSimuladoDTO } from './dtos/tipo-simulado.dto.output';
import { AxiosError } from 'axios';

@Injectable()
export class SimuladoService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly auditLod: AuditLogService,
  ) {
    this.http.axiosRef.defaults.baseURL =
      this.configService.get<string>('SIMULADO_URL');
  }

  async create(dto: CreateSimuladoDTOInput) {
    return this.http
      .post('v1/simulado', dto)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  async getAll() {
    return this.http
      .get<SimuladoDTO[]>('v1/simulado')
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  async getTipos() {
    return this.http
      .get<TipoSimuladoDTO[]>('v1/tipo-simulado')
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  async getToAnswer(id: string) {
    return this.http
      .get<SimuladoDTO>(`v1/simulado/toanswer/${id}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  async getById(id: string) {
    return this.http
      .get<SimuladoDTO>(`v1/simulado/${id}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      );
  }

  public async delete(id: string): Promise<void> {
    this.http.delete<SimuladoDTO>(`v1/simulado/${id}`).pipe(
      catchError((error: AxiosError) => {
        throw error.response.data;
      }),
    );
  }

  public async answer(dto: AnswerSimulado) {
    this.http
      .post(`v1/simulado/answer`, dto)
      .pipe(
        catchError((error: AxiosError) => {
          throw error.response.data;
        }),
      )
      .subscribe();
  }

  public async report(reportDto: ReportDTO, userId: number) {
    if (reportDto.entity === ReportEntity.Simulado) {
      await this.auditLod.create({
        entityType: 'Simulado',
        entityId: 0,
        changes: { message: reportDto.message },
        updatedBy: userId,
      });
    } else {
      this.http
        .post(`v1/questao/report`, reportDto)
        .pipe(
          catchError((error: AxiosError) => {
            throw error.response.data;
          }),
        )
        .subscribe();
    }
  }

  public async questoes(status: Status) {
    return await this.http
      .get(`v1/questao/${status}`)
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

  public async questoesUpdateStatus(id: string, status: Status) {
    return await this.http
      .patch(`v1/questao/${id}/${status}`)
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
}
