import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { LogosDoCaderno } from './caderno-logos.service';

/**
 * O corpo do POST interno, espelhando o `LogosDtoInput` do ms-simulado.
 *
 * ⚠️ As chaves vêm de `keyof LogosDoCaderno` de propósito: um literal solto
 * (`Record<string, string>`) deixaria passar chave errada em silêncio, e nada
 * ligaria este formato de fio ao tipo que o origina. Assim, mexer em
 * `LogosDoCaderno` não muda o contrato HTTP sem diff visível aqui.
 */
interface CorpoDoCaderno {
  logos: Partial<Record<keyof LogosDoCaderno, string>>;
}

/**
 * As chaves que vão para o fio — fechadas nas DUAS pontas.
 *
 * ⚠️ Construção incomum de propósito, não simplifique para
 * `['vnf', 'cursinho'] as const`:
 *
 * - **runtime**: só estas chaves são percorridas, então uma chave extra que
 *   aparecesse em `logos` não tem como vazar para o corpo do POST;
 * - **compilação**: o `satisfies Record<keyof LogosDoCaderno, null>` exige que
 *   a lista esteja COMPLETA. Acrescentar `parceiro?: Buffer` em
 *   `LogosDoCaderno` para aqui o build com "Property 'parceiro' is missing".
 *
 * Sem a segunda metade, um logo novo simplesmente nunca seria enviado — e em
 * silêncio, porque `CorpoDoCaderno` aceitaria a chave de bom grado.
 */
const CHAVES_DE_LOGO = Object.keys({
  vnf: null,
  cursinho: null,
} satisfies Record<keyof LogosDoCaderno, null>) as (keyof LogosDoCaderno)[];

@Injectable()
export class CadernoHttpService {
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
   * ⚠️ **POST, não GET, desde o card 13:** a requisição passou a carregar os
   * logos, que o ms-simulado não tem como buscar (a chave do logo do cursinho
   * está no MySQL e depende de quem pediu).
   *
   * O `GET v1/caderno/:id` continua existindo do outro lado, gerando zip sem
   * logos — é o que segura a janela entre os dois deploys.
   */
  async baixar(
    simuladoId: string,
    draft: boolean,
    logos: LogosDoCaderno,
  ): Promise<{ buffer: Buffer; contentType: string; avisos?: string }> {
    // ⚠️ O literal, não o valor recebido: concatenar o que veio na query
    // injeta parâmetro na chamada interna. O `simuladoId` já veio validado
    // pelo ObjectIdPipe.
    const rota = `v1/caderno/${simuladoId}${draft ? '?draft=true' : ''}`;

    // ⚠️ O base64 é feito aqui, não no `CadernoLogosService`: quem fala HTTP é
    // quem codifica para HTTP. E a chave é OMITIDA quando não há logo — o
    // outro lado tolera `null`, mas o contrato é a ausência.
    //
    // ⚠️ Itera a lista de chaves, não o objeto recebido — ver `CHAVES_DE_LOGO`.
    // É a mesma forma do outro lado do hop: o `decodificarLogos` do
    // ms-simulado percorre `Object.keys(NOMES_DOS_LOGOS)` em vez do corpo
    // recebido, pelo mesmo motivo. As duas pontas simétricas.
    const corpo: CorpoDoCaderno = { logos: {} };
    for (const chave of CHAVES_DE_LOGO) {
      const buffer = logos[chave];
      if (buffer?.length) corpo.logos[chave] = buffer.toString('base64');
    }

    const { buffer, contentType, headers } = await this.axios.postBinary(
      rota,
      corpo,
    );
    // Minúsculas: é como o `postBinary` normaliza. Ver o docblock lá.
    return { buffer, contentType, avisos: headers['x-caderno-avisos'] };
  }
}
