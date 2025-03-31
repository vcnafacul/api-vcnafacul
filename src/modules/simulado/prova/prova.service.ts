import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';
import { CreateProvaDTORequest } from '../dtos/prova-create.dto.request';
import { CreateProvaDTOInput } from './dtos/prova-create.dto.input';

@Injectable()
export class ProvaService {
  constructor(
    private readonly axios: HttpServiceAxios,
    private readonly configService: ConfigService,
  ) {
    this.axios.setBaseURL(this.configService.get<string>('SIMULADO_URL'));
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
    return await this.axios.post(`v1/prova`, request);
  }

  public async getProvaById(id: string) {
    return await this.axios.get(`v1/prova/${id}`);
  }

  public async getProvasAll() {
    return await this.axios.get(`v1/prova`);
  }

  public async getMissingNumbers(id: string) {
    return await this.axios.get(`v1/prova/missing/${id}`);
  }
}
