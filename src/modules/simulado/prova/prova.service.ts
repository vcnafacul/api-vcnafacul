import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CreateProvaDTORequest } from '../dtos/prova-create.dto.request';
import { CreateProvaDTOInput } from './dtos/prova-create.dto.input';
import { CacheService } from 'src/shared/modules/cache/cache.service';

@Injectable()
export class ProvaService {
  constructor(
    private readonly axios: HttpServiceAxios,
    private readonly envService: EnvService,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly cache: CacheService,
  ) {
    this.axios.setBaseURL(this.envService.get('SIMULADO_URL'));
  }

  public async createProva(prova: CreateProvaDTOInput, file: any) {
    const fileName = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_SIMULADO'),
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

  public async getSummary() {
    return this.cache.wrap<object>(
      'prova',
      async () => await this.axios.get<any>(`v1/prova/summary`),
    );
  }
}
