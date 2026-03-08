import { Injectable } from '@nestjs/common';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class RuleSetFormService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('FORMULARIO_URL'),
    );
  }

  public async getRuleSets(query: GetAllDtoInput) {
    let url = `v1/rules-set`;
    const queryParams = Object.keys(query)
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    if (queryParams) {
      url = `${url}?${queryParams}`;
    }

    return await this.axios.get(url);
  }

  public async getRuleSetById(id: string) {
    return await this.axios.get(`v1/rules-set/${id}`);
  }

  public async createRuleSet(dto: unknown) {
    return await this.axios.post(`v1/rules-set`, dto);
  }

  public async updateRuleSet(id: string, dto: unknown) {
    return await this.axios.patch(`v1/rules-set/${id}`, dto);
  }

  public async deleteRuleSet(id: string) {
    return await this.axios.delete(`v1/rules-set/${id}`);
  }

  public async addRule(dto: unknown) {
    return await this.axios.patch(`v1/rules-set/add`, dto);
  }

  public async removeRule(dto: unknown) {
    return await this.axios.patch(`v1/rules-set/remove`, dto);
  }

  public async ranking(dto: unknown) {
    return await this.axios.post(`v1/rules-set/ranking`, dto);
  }

  public async getLastRanking(id: string) {
    return await this.axios.get(`v1/rules-set/${id}/last-ranking`);
  }

  public async getRuleSetByInscriptionId(inscriptionId: string) {
    return await this.axios.get(
      `v1/rules-set/by-inscription/${inscriptionId}`,
    );
  }
}
