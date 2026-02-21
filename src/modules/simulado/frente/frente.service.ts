import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class FrenteProxyService {
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

  async create(body: any) {
    const { name, materia, ...rest } = body;
    return await this.axios.post('v1/frente', {
      ...rest,
      nome: name,
      ...(materia ? { materia } : {}),
    });
  }

  async getAll(page: number, limit: number) {
    return await this.axios.get(`v1/frente?page=${page}&limit=${limit}`);
  }

  async getById(id: string) {
    return await this.axios.get(`v1/frente/${id}`);
  }

  async update(id: string, body: any) {
    const { name, ...rest } = body;
    return await this.axios.patch(`v1/frente/${id}`, {
      ...rest,
      ...(name ? { nome: name } : {}),
    });
  }

  async getByMateria(materiaId: string) {
    return await this.axios.get(`v1/frente/materia/${materiaId}`);
  }

  async getByMateriaContentApproved(materiaId: string) {
    return await this.axios.get(`v1/frente/materiawithcontent/${materiaId}`);
  }
}
