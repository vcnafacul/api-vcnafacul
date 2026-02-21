import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CreateProvaDTORequest } from '../dtos/prova-create.dto.request';
import { CreateProvaDTOInput } from './dtos/prova-create.dto.input';

@Injectable()
export class ProvaService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly cache: CacheService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  public async createProva(
    prova: CreateProvaDTOInput,
    file: any,
    gabarito: any,
  ) {
    const fileName = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_SIMULADO'),
    );

    const gabaritoName = await this.blobService.uploadFile(
      gabarito,
      this.envService.get('BUCKET_SIMULADO'),
    );

    if (!fileName || !gabaritoName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    const request = new CreateProvaDTORequest();
    request.edicao = prova.edicao;
    request.exame = prova.exame;
    request.ano = parseInt(prova.ano as unknown as string);
    request.aplicacao = parseInt(prova.aplicacao as unknown as string);
    request.tipo = prova.tipo;
    request.filename = fileName;
    request.gabarito = gabaritoName;
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

  public async getFile(id: string) {
    return await this.blobService.getFile(
      `${id}`,
      this.envService.get('BUCKET_SIMULADO'),
    );
  }

  public async startSync() {
    return await this.axios.post('v1/prova/sync', {});
  }

  public async getSyncReport() {
    return await this.axios.get('v1/prova/sync/report');
  }

  public async updateProvaFiles(
    provaId: string,
    file?: Express.Multer.File,
    gabarito?: Express.Multer.File,
  ) {
    const bucket = 'BUCKET_SIMULADO';

    if (!file && !gabarito) {
      throw new HttpException(
        'Nenhum arquivo enviado para atualização',
        HttpStatus.BAD_REQUEST,
      );
    }

    const current = (await this.axios.get(`v1/prova/${provaId}`)) as {
      filename: string;
      gabarito: string;
    };

    let newFileName: string | undefined;
    let newGabaritoName: string | undefined;

    if (file) {
      newFileName = await this.blobService.uploadFile(
        file,
        this.envService.get(bucket),
      );
    }

    if (gabarito) {
      newGabaritoName = await this.blobService.uploadFile(
        gabarito,
        this.envService.get(bucket),
      );
    }

    const payload: any = {};
    if (newFileName) payload.filename = newFileName;
    if (newGabaritoName) payload.gabarito = newGabaritoName;

    try {
      const updated = await this.axios.patch(
        `v1/prova/${provaId}/files`,
        payload,
      );

      try {
        if (newFileName && current.filename) {
          await this.blobService.deleteFile(
            current.filename,
            this.envService.get(bucket),
          );
        }

        if (newGabaritoName && current.gabarito) {
          await this.blobService.deleteFile(
            current.gabarito,
            this.envService.get(bucket),
          );
        }
      } catch (err) {
        throw new HttpException(
          'Erro ao deletar arquivos antigos',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return updated;
    } catch (err) {
      if (newFileName) {
        await this.blobService.deleteFile(newFileName, bucket);
      }
      if (newGabaritoName) {
        await this.blobService.deleteFile(newGabaritoName, bucket);
      }

      throw new HttpException(
        'Erro ao atualizar arquivos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
