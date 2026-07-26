import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { CreateCategoriaDtoInput } from './dtos/create-categoria.dto.input';

@Injectable()
export class CategoriaProxyService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async getAll(page: number, limit: number) {
    return await this.axios.get(`v1/categoria?page=${page}&limit=${limit}`);
  }

  async getById(id: string) {
    return await this.axios.get(`v1/categoria/${id}`);
  }

  async create(dto: CreateCategoriaDtoInput) {
    return await this.axios.post('v1/categoria', dto);
  }

  async delete(id: string) {
    return await this.axios.delete(`v1/categoria/${id}`);
  }
}
