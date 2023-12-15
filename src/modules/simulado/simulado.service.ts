import { HttpService } from '@nestjs/axios';
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
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
import { CreateProvaDTOInput } from './dtos/prova-create.dto.input';
import * as ftp from 'basic-ftp';
import * as fs from 'fs';
import { CreateProvaDTORequest } from './dtos/prova-create.dto.request';

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

  public async answer(dto: AnswerSimulado) {
    this.http
      .post(`v1/simulado/answer`, dto)
      .pipe(
        catchError((err) => {
          throw new ForbiddenException(err.message);
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
          catchError((err) => {
            throw new ForbiddenException(err.message);
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

  public async createProva(prova: CreateProvaDTOInput, file: any) {
    const fileName = await this.uploadFile(file);
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    const request = new CreateProvaDTORequest();
    request.edicao = prova.edicao;
    request.exame = prova.exame;
    request.ano = parseInt(prova.ano as unknown as string);
    request.aplicacao = parseInt(prova.aplicacao as unknown as string);
    request.filename = fileName;
    return await this.http
      .post(`v1/prova`, request)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          throw new ForbiddenException(err.response.data.message);
        }),
      );
  }

  public async getProvaById(id: string) {
    return await this.http
      .get(`v1/prova/${id}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          throw new ForbiddenException(err.response.data.message);
        }),
      );
  }

  public async getProvasAll() {
    return await this.http
      .get(`v1/prova`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          throw new ForbiddenException(err.response.data.message);
        }),
      );
  }

  private async uploadFile(file: any): Promise<string> {
    const client = new ftp.Client(30000);
    try {
      await client.access({
        host: this.configService.get<string>('FTP_HOST'),
        user: this.configService.get<string>('FTP_USER'),
        password: this.configService.get<string>('FTP_PASSWORD'),
      });
      const typeFile = file.originalname.split('.')[1];
      const nameFile = Date.now();

      const tempFilePath = `${this.configService.get<string>(
        'FTP_TEMP_FILE',
      )}${nameFile}.${typeFile}`;

      fs.writeFileSync(tempFilePath, file.buffer);

      const ftpResponse = await client.uploadFrom(
        tempFilePath,
        `${nameFile}.${typeFile}`,
      );
      fs.unlinkSync(tempFilePath);
      if (ftpResponse.code == 226) {
        return `${nameFile}.${typeFile}`;
      }
      return '';
    } catch (error) {
      console.log(error);
      return '';
    } finally {
      client.close();
    }
  }
}
