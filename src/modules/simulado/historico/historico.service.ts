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
 * ⚠️ **Nada que venha do chamador entra cru numa URL deste arquivo — nem em
 * caminho, nem em query.** São dois pontos de entrada distintos, e fechar só
 * um deixa o outro aberto:
 *
 * - **Caminho:** todo segmento vai por `seg()` (`encodeURIComponent`). O
 *   Express decodifica os `%XX` dos path params, e concatenar o valor cru
 *   deixa o CHAMADOR reescrever a URL que o gateway manda: um `?` embutido
 *   transforma o resto em query e sobrepõe o `usuario` que este serviço
 *   acabou de resolver do JWT, e um `/` mais `..` alcança outra rota do ms.
 * - **Query:** todo par vai por `URLSearchParams`, nunca por concatenação —
 *   ver o `getAllByUser`. Um valor cru com `#` fazia o `URL` do axios
 *   descartar tudo depois dele, inclusive o `userId` do JWT acrescentado no
 *   fim: o escopo inteiro sumia. Medido.
 *
 * Em resumo: a regra do caminho sozinha NÃO torna este arquivo seguro.
 *
 * O `relatorio-http.service.ts` fechou a mesma classe no card `09`.
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
    // ⚠️ `URLSearchParams`, e não concatenação: os valores da query chegam do
    // cliente e `page`/`limit` no `GetAllDtoInput` têm só `@IsOptional()` —
    // uma STRING passa pelo pipe. Concatenada crua, um `#` embutido faz o
    // `URL` do axios descartar tudo depois dele, inclusive o `userId` que esta
    // linha acrescenta: o escopo inteiro some e o chamador lê o histórico de
    // quem quiser. Medido.
    //
    // ⚠️ E `set()` no fim, não `append()`: assim um `userId` que tenha
    // sobrevivido na query é SOBRESCRITO, nunca duplicado.
    const params = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)]),
    );
    params.set('userId', userId);
    return await this.axios.get(`v1/historico?${params}`);
  }

  /**
   * ⚠️ **`usuario` obrigatório, e vem do JWT.** Esta rota serve o estudante
   * vendo o PRÓPRIO histórico. Sem ele, qualquer usuário autenticado lia o de
   * qualquer outro pelo id.
   *
   * ⚠️ E a comparação acontece no ms, não aqui: esta api não tem o documento.
   * Buscar e comparar na volta traria as respostas alheias para dentro do
   * processo antes de descobrir que não podia — um 403 depois do vazamento.
   *
   * ⚠️ **A negativa chega como 404, e este método não faz nada para isso** —
   * nem precisa. O ms LANÇA `NotFoundException` (antes devolvia `null`, que o
   * Nest serializava como 200 de corpo vazio e chegava aqui como `''`); o
   * axios rejeita, e o `HttpServiceAxios.handleError` reergue como
   * `HttpException` com o status da origem. É 404 e não 403 de propósito: a
   * resposta é indistinguível de "não existe", e um 403 confirmaria a
   * existência do histórico alheio a quem perguntou.
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
