import { Injectable } from '@nestjs/common';

import { EnvService } from 'src/shared/modules/env/env.service';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { GetHistoricoDTOInput } from '../dtos/get-historico.dto';

@Injectable()
export class HistoricoService {
  constructor(
    private readonly axios: HttpServiceAxios,
    private readonly env: EnvService,
  ) {
    this.axios.setBaseURL(this.env.get('SIMULADO_URL'));
  }
  async getAllByUser(query: GetHistoricoDTOInput, userId: string) {
    let baseUrl = 'v1/historico?';

    Object.keys(query).forEach((key) => {
      baseUrl = baseUrl + `${key}=${query[key]}&`;
    });

    baseUrl += `userId=${userId}`;
    return await this.axios.get(baseUrl);
  }

  async getById(id: string) {
    return this.axios.get(`v1/historico/${id}`);
  }

  async getPerformance(userId: string) {
    return this.axios.get(`v1/historico/performance/${userId}`);
  }
}
