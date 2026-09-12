import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

const BASE = 'v1/caderno/template';

/**
 * O proxy 1:1 dos endpoints de template do caderno no ms-simulado.
 *
 * Nenhuma regra de negócio mora aqui: o layout versionado vive no ms, e a api
 * só repassa. O upload multipart do rascunho fica fora, em serviço próprio —
 * é o único caso sem precedente no repo.
 */
@Injectable()
export class CadernoTemplateHttpService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  /** A versão publicada — a que o coordenador baixa hoje. */
  async publicada<T>(): Promise<T> {
    return this.axios.get<T>(BASE);
  }

  /** O rascunho em edição. O ms devolve 404 quando não há nenhum. */
  async rascunho<T>(): Promise<T> {
    return this.axios.get<T>(`${BASE}/rascunho`);
  }

  async versoes<T>(): Promise<T> {
    return this.axios.get<T>(`${BASE}/versoes`);
  }

  async descartarRascunho<T>(): Promise<T> {
    return this.axios.delete<T>(`${BASE}/rascunho`);
  }

  async publicar<T>(): Promise<T> {
    return this.axios.post<T>(`${BASE}/rascunho/publicar`);
  }

  /**
   * Restaura uma versão anterior, criando um rascunho a partir dela.
   *
   * ⚠️ `criadorId` é campo INTERNO, injetado pela api a partir do JWT — não
   * vem do cliente. Mesmo padrão de `dtos/prova-create.dto.request.ts:13`.
   *
   * ⚠️ `versao` é `number` de propósito: concatenar valor de query ou de path
   * vindo do cliente na chamada ao ms é injeção de parâmetro, como o card 05
   * já deixou escrito. Quem interpreta o que chegou é o controller; aqui o
   * número já chega tipado, e o TS acusa se um dia vier string.
   *
   * ⚠️ **Não há `notas` aqui, e é de propósito.** Medido no ms: o
   * `restaurar` de lá chama `service.restaurar(n, dto.criadorId)` e descarta
   * o `notas` do corpo — o docblock de lá diz por quê ("quem escreve a nota
   * de um rascunho restaurado é o serviço: 'Restaurado da versão N'").
   * Aceitar o campo aqui seria oferecer ao coordenador um texto que
   * desaparece em silêncio. A api não aceita o que não consegue entregar.
   */
  async restaurar<T>(versao: number, criadorId: string): Promise<T> {
    return this.axios.post<T>(`${BASE}/versoes/${versao}/restaurar`, {
      criadorId,
    });
  }

  /**
   * O zip modelo, para o coordenador subir no Overleaf.
   *
   * ⚠️ A query sai de tipos, não de strings: `rascunho` vira o LITERAL
   * `?rascunho=1`, nunca o valor recebido. Assim o serviço não tem como
   * concatenar texto do usuário na rota interna por construção, e não por
   * disciplina.
   */
  async zipDeTeste(opts: {
    versao?: number;
    rascunho?: boolean;
  }): Promise<{ buffer: Buffer; contentType: string }> {
    const partes: string[] = [];
    if (opts.versao !== undefined) partes.push(`versao=${opts.versao}`);
    if (opts.rascunho) partes.push('rascunho=1');
    const rota = `${BASE}/teste${partes.length ? `?${partes.join('&')}` : ''}`;

    const { buffer, contentType } = await this.axios.getBinary(rota);
    return { buffer, contentType };
  }
}
