import { Injectable } from '@nestjs/common';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class RuleFormService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('FORMULARIO_URL'),
    );
  }

  public async getRules(query: GetAllDtoInput) {
    let url = `v1/rule`;
    const queryParams = Object.keys(query)
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    if (queryParams) {
      url = `${url}?${queryParams}`;
    }

    return await this.axios.get(url);
  }

  public async getRuleById(id: string) {
    return await this.axios.get(`v1/rule/${id}`);
  }

  public async createRule(dto: unknown) {
    return await this.axios.post(`v1/rule`, dto);
  }

  public async updateRule(id: string, dto: unknown) {
    return await this.axios.put(`v1/rule/${id}`, dto);
  }

  public async deleteRule(id: string) {
    return await this.axios.delete(`v1/rule/${id}`);
  }
}
