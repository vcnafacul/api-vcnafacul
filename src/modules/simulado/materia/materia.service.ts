import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class MateriaProxyService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
    private readonly cache: CacheService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async getAll(page: number, limit: number) {
    return await this.axios.get(`v1/materia?page=${page}&limit=${limit}`);
  }

  async getById(id: string) {
    return await this.axios.get(`v1/materia/${id}`);
  }
}
