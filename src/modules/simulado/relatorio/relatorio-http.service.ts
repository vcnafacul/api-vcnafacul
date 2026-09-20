import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

/**
 * ⚠️ **Todo segmento de caminho vai por `encodeURIComponent`, e isso é
 * segurança, não estilo.** O Express decodifica os `%XX` dos path params, e
 * concatenar o valor cru deixa o CHAMADOR reescrever a URL que o gateway
 * manda: um `?` embutido transforma o resto em query e sobrepõe o
 * `cursinhoId` que este serviço acabou de resolver do JWT (vazamento entre
 * cursinhos, medido), e um `/` mais `..` alcança outra rota do ms.
 *
 * ⚠️ Este docblock já citou `GET /v1/historico/:id` como exemplo de rota "que
 * não checa dono". **Não vale mais:** o card `11` pôs o gate de dono lá. O
 * risco de troca de rota continua real — o ms tem rotas de sobra, e a próxima
 * pode não ter gate nenhum —, mas o argumento é o escape, não aquela rota.
 *
 * O filtro do ms está certo; o que estava errado era o encanamento até ele.
 */
@Injectable()
export class RelatorioHttpService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async buscarLinhas(
    simuladoId: string,
    cursinhoId: string,
    turmaId?: string,
  ): Promise<unknown> {
    return this.axios.get(
      `v1/relatorio-simulado/${this.seg(simuladoId)}?${this.query(
        cursinhoId,
        turmaId,
      )}`,
    );
  }

  async buscarQuestoes(
    simuladoId: string,
    cursinhoId: string,
    turmaId?: string,
  ): Promise<unknown> {
    return this.axios.get(
      `v1/relatorio-simulado/${this.seg(simuladoId)}/questoes?${this.query(
        cursinhoId,
        turmaId,
      )}`,
    );
  }

  async buscarSimulados(
    cursinhoId: string,
    turmaId?: string,
  ): Promise<unknown> {
    return this.axios.get(
      `v1/relatorio-simulado/simulados?${this.query(cursinhoId, turmaId)}`,
    );
  }

  /**
   * Um estudante só: `cursinhoId` é o gate, e turma não entra — o `usuario`
   * já identifica a pessoa.
   */
  async buscarDetalheDoEstudante(
    simuladoId: string,
    usuario: string,
    cursinhoId: string,
  ): Promise<unknown> {
    return this.axios.get(
      `v1/relatorio-simulado/${this.seg(simuladoId)}/estudante/${this.seg(
        usuario,
      )}?${this.query(cursinhoId)}`,
    );
  }

  /**
   * Um único segmento de caminho, escapado. Ver o docblock da classe: sem
   * isto o valor cru do chamador reescreve a URL do ms.
   */
  private seg(valor: string): string {
    return encodeURIComponent(valor);
  }

  /**
   * ⚠️ `turmaId` OMITIDO quando não vem, nunca vazio: `turmaId=` chega ao ms
   * como string vazia, vira filtro por `''` e devolve lista vazia — um
   * relatório em branco sem erro nenhum.
   */
  private query(cursinhoId: string, turmaId?: string): string {
    const partes = [`cursinhoId=${encodeURIComponent(cursinhoId)}`];
    if (turmaId !== undefined) {
      partes.push(`turmaId=${encodeURIComponent(turmaId)}`);
    }
    return partes.join('&');
  }
}
