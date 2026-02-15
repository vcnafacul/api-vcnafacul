import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class SubjectProxyService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async create(body: any) {
    return await this.axios.post('v1/subject', body);
  }

  async getAll(page: number, limit: number, frente?: string) {
    let url = `v1/subject?page=${page}&limit=${limit}`;
    if (frente) url += `&frente=${frente}`;
    return await this.axios.get(url);
  }

  async getById(id: string) {
    return await this.axios.get(`v1/subject/${id}`);
  }

  async getByFrente(frenteId: string) {
    return await this.axios.get(`v1/subject/frente/${frenteId}`);
  }

  async getOrder(frenteId: string) {
    return await this.axios.get(`v1/subject/frente/${frenteId}`);
  }

  async update(id: string, body: any) {
    return await this.axios.patch(`v1/subject/${id}`, body);
  }

  async changeOrder(body: any) {
    return await this.axios.patch('v1/subject/order', body);
  }

  async delete(id: string) {
    return await this.axios.delete(`v1/subject/${id}`);
  }
}
