import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class CartaoRespostaHttpService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async baixarCartao(
    simuladoId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    return this.axios.getBinary(`v1/cartao-resposta/${simuladoId}`);
  }

  async criarHistorico(payload: {
    usuario: string;
    imageKey: string;
    cartaoCode: string;
    cursinhoId?: string;
    turmaId?: string;
  }): Promise<{ historicoId: string }> {
    return this.axios.post('v1/cartao-resposta/historico', payload);
  }

  /**
   * Reabre um cartão que falhou — com foto nova (`imageKey`) ou só pedindo
   * nova tentativa.
   *
   * ⚠️ `encodeURIComponent` no segmento, e todo o resto no CORPO. Um path
   * param cru já deixou o chamador reescrever a URL do ms — um `?` embutido
   * sobrepunha o `cursinhoId` resolvido do JWT.
   */
  async reprocessar(
    historicoId: string,
    corpo: {
      cursinhoId: string;
      imageKey?: string;
      simuladoId?: string;
      cartaoCode?: string;
    },
  ): Promise<void> {
    await this.axios.post(
      `v1/cartao-resposta/${encodeURIComponent(historicoId)}/reprocessar`,
      corpo,
    );
  }

  /**
   * Onde está a foto do cartão, se o histórico é do cursinho — o ms responde
   * 404 para histórico alheio ou sem foto. Mesmo contrato do `reprocessar`:
   * segmento codificado e o `cursinhoId` no corpo.
   */
  async localizarImagem(
    historicoId: string,
    corpo: { cursinhoId: string },
  ): Promise<{ imageKey: string }> {
    return this.axios.post(
      `v1/cartao-resposta/${encodeURIComponent(historicoId)}/imagem`,
      corpo,
    );
  }
}
