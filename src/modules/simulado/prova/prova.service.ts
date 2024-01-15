import { HttpService } from '@nestjs/axios';
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';
import { CreateProvaDTOInput } from './dtos/prova-create.dto.input';
import { CreateProvaDTORequest } from '../dtos/prova-create.dto.request';
import { catchError, map } from 'rxjs';

@Injectable()
export class ProvaService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.http.axiosRef.defaults.baseURL =
      this.configService.get<string>('SIMULADO_URL');
  }

  public async createProva(prova: CreateProvaDTOInput, file: any) {
    const fileName = await uploadFileFTP(
      file,
      this.configService.get<string>('FTP_TEMP_FILE'),
      this.configService.get<string>('FTP_HOST'),
      this.configService.get<string>('FTP_USER'),
      this.configService.get<string>('FTP_PASSWORD'),
    );
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    const request = new CreateProvaDTORequest();
    request.edicao = prova.edicao;
    request.exame = prova.exame;
    request.ano = parseInt(prova.ano as unknown as string);
    request.aplicacao = parseInt(prova.aplicacao as unknown as string);
    request.tipo = prova.tipo;
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

  public async getMissingNumbers(id: string) {
    return await this.http
      .get(`v1/prova/missing/${id}`)
      .pipe(map((res) => res.data))
      .pipe(
        catchError((err) => {
          throw new ForbiddenException(err.response.data.message);
        }),
      );
  }
}
