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

  async getGroupedByArea() {
    return this.cache.wrap(
      'materia:grouped-by-area',
      () => this.axios.get('v1/materia/grouped-by-area'),
      24 * 60 * 60 * 1000, // 24h
    );
  }

  async create(body: Record<string, unknown>) {
    const result = await this.axios.post('v1/materia', body);
    await this.invalidateGroupedByAreaCache();
    return result;
  }

  async update(id: string, body: Record<string, unknown>) {
    const result = await this.axios.patch(`v1/materia/${id}`, body);
    await this.invalidateGroupedByAreaCache();
    return result;
  }

  async delete(id: string) {
    const result = await this.axios.delete(`v1/materia/${id}`);
    await this.invalidateGroupedByAreaCache();
    return result;
  }

  async invalidateGroupedByAreaCache() {
    await this.cache.del('materia:grouped-by-area');
  }
}
