import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

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
      `v1/relatorio-simulado/${simuladoId}?${this.query(cursinhoId, turmaId)}`,
    );
  }

  async buscarQuestoes(
    simuladoId: string,
    cursinhoId: string,
    turmaId?: string,
  ): Promise<unknown> {
    return this.axios.get(
      `v1/relatorio-simulado/${simuladoId}/questoes?${this.query(
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
