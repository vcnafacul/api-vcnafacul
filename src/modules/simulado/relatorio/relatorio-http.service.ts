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

  /**
   * ⚠️ **POST, e o recorte vai no CORPO** — as três consultas abaixo.
   *
   * O ms filtrava por um `turmaId` gravado na junção no momento do upload, que
   * nunca é atualizado: estudante que entrou na turma depois de enviar sumia do
   * recorte, e no relatório por turma aparecia como "não enviou" — a tela
   * AFIRMANDO algo falso. Ver card 18.
   *
   * A verdade sobre a turma vive no MySQL, aqui. Então quem resolve o recorte é
   * esta api, mandando a lista de estudantes; o ms filtra por ela.
   *
   * ⚠️ **No corpo porque não cabe na URL:** um UUID ocupa 36 caracteres, e uma
   * turma de 50 já passa de 2.300 — acima do limite seguro.
   *
   * ⚠️ `usuarios` AUSENTE = o cursinho inteiro. Um array vazio seria outra
   * coisa ("nenhum estudante"), e o ms o recusa de propósito.
   */
  async buscarLinhas(
    simuladoId: string,
    cursinhoId: string,
    usuarios?: string[],
  ): Promise<unknown> {
    return this.axios.post(
      `v1/relatorio-simulado/${this.seg(simuladoId)}`,
      this.corpo(cursinhoId, usuarios),
    );
  }

  async buscarQuestoes(
    simuladoId: string,
    cursinhoId: string,
    usuarios?: string[],
  ): Promise<unknown> {
    return this.axios.post(
      `v1/relatorio-simulado/${this.seg(simuladoId)}/questoes`,
      this.corpo(cursinhoId, usuarios),
    );
  }

  async buscarSimulados(
    cursinhoId: string,
    usuarios?: string[],
  ): Promise<unknown> {
    return this.axios.post(
      'v1/relatorio-simulado/simulados',
      this.corpo(cursinhoId, usuarios),
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
   * ⚠️ `usuarios` OMITIDO quando não há recorte, nunca `[]`: array vazio
   * significaria "nenhum estudante" e o ms o recusa. Ausente é o cursinho
   * inteiro, que é o relatório geral.
   */
  /**
   * ⚠️ Só o detalhe de UM estudante ainda usa query string, e continua `GET`:
   * ali não há lista — o `usuario` já identifica a pessoa e o `cursinhoId` é o
   * gate. Não há recorte por turma para congelar.
   */
  private query(cursinhoId: string): string {
    return `cursinhoId=${encodeURIComponent(cursinhoId)}`;
  }

  private corpo(
    cursinhoId: string,
    usuarios?: string[],
  ): Record<string, unknown> {
    return usuarios === undefined ? { cursinhoId } : { cursinhoId, usuarios };
  }
}
