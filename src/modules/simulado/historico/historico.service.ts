import { Injectable } from '@nestjs/common';
import { Period } from 'src/modules/user/enum/period';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { GetHistoricoDTOInput } from '../dtos/get-historico.dto';

/**
 * ⚠️ **Todo segmento de caminho vai por `encodeURIComponent`, e isso é
 * segurança, não estilo.** O Express decodifica os `%XX` dos path params, e
 * concatenar o valor cru deixa o CHAMADOR reescrever a URL que o gateway
 * manda: um `?` embutido transforma o resto em query e sobrepõe o `usuario`
 * que este serviço acabou de resolver do JWT, e um `/` mais `..` alcança
 * outra rota do ms.
 *
 * O `relatorio-http.service.ts` fechou a mesma classe no card `09` — e o
 * docblock de lá cita ESTA rota pelo nome como o que ela alcançava.
 */
const seg = (v: string) => encodeURIComponent(v);

@Injectable()
export class HistoricoService {
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
  async getAllByUser(query: GetHistoricoDTOInput, userId: string) {
    let baseUrl = 'v1/historico?';

    Object.keys(query).forEach((key) => {
      baseUrl = baseUrl + `${key}=${query[key]}&`;
    });

    baseUrl += `userId=${userId}`;
    return await this.axios.get(baseUrl);
  }

  /**
   * ⚠️ **`usuario` obrigatório, e vem do JWT.** Esta rota serve o estudante
   * vendo o PRÓPRIO histórico. Sem ele, qualquer usuário autenticado lia o de
   * qualquer outro pelo id.
   *
   * ⚠️ E a comparação acontece no ms, não aqui: esta api não tem o documento.
   * Buscar e comparar na volta traria as respostas alheias para dentro do
   * processo antes de descobrir que não podia — um 403 depois do vazamento.
   */
  async getById(id: string, usuario: string) {
    return this.axios.get(`v1/historico/${seg(id)}?usuario=${seg(usuario)}`);
  }

  async getPerformance(userId: string) {
    return this.axios.get(`v1/historico/performance/${seg(userId)}`);
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
