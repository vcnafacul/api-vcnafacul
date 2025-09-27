import { Injectable } from '@nestjs/common';
import { Period } from 'src/modules/user/enum/period';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { GetHistoricoDTOInput } from '../dtos/get-historico.dto';

@Injectable()
export class HistoricoService {
  constructor(
    private readonly axios: HttpServiceAxios,
    private readonly envService: EnvService,
    private readonly cache: CacheService,
  ) {
    this.axios.setBaseURL(this.envService.get('SIMULADO_URL'));
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

  public async getSummary() {
    return this.cache.wrap<object>(
      'historico',
      async () => await this.axios.get<any>(`v1/historico/summary`),
    );
  }

  public async getAggregateByPeriod(period: Period) {
    return this.cache.wrap<object>(
      'historico:aggregateByPeriod',
      async () =>
        await this.axios.get<object>(
          `v1/historico/aggregate-by-Period?groupBy=${period}`,
        ),
    );
  }

  public async getAggregateByPeriodAndType(period: Period) {
    return this.cache.wrap<object>(
      'historico:aggregateByPeriodAndType',
      async () =>
        await this.axios.get<object>(
          `v1/historico/aggregate-by-Period-and-Type?groupBy=${period}`,
        ),
    );
  }
}
