import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { LogosDoCaderno } from './caderno-logos.service';

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
    const corpo = { logos: {} as Record<string, string> };
    for (const [chave, buffer] of Object.entries(logos)) {
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
