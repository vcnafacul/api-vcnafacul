import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

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

  async baixar(
    simuladoId: string,
    draft: boolean,
  ): Promise<{ buffer: Buffer; contentType: string; avisos?: string }> {
    // ⚠️ O literal, não o valor recebido: concatenar o que veio na query
    // injeta parâmetro na chamada interna. O `simuladoId` já veio validado
    // pelo ObjectIdPipe.
    const rota = `v1/caderno/${simuladoId}${draft ? '?draft=true' : ''}`;
    const { buffer, contentType, headers } = await this.axios.getBinary(rota);
    // Minúsculas: é como o `getBinary` normaliza. Ver o docblock lá.
    return { buffer, contentType, avisos: headers['x-caderno-avisos'] };
  }
}
