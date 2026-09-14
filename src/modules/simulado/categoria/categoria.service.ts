import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { CreateCategoriaDtoInput } from './dtos/create-categoria.dto.input';

@Injectable()
export class CategoriaProxyService {
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
   * ⚠️ O `dono` é obrigatório: no ms toda categoria pertence a alguém --
   * `'system'` para as da plataforma, ou o `cursinhoId`. Quem chama é que
   * decide, e nunca a partir do corpo da requisição.
   *
   * ⚠️ `page`/`limit` aceitam `string` porque no fluxo do cursinho eles vêm
   * crus do querystring, no MESMO molde documentado em
   * `ProvaService.getProvasAll`: o ausente tem de ficar **ausente** na URL, em
   * vez de virar a string "undefined" -- o ms leria isso como paginação
   * inválida e falharia em silêncio. O `!== undefined` (em vez de um `if`
   * simples) preserva o `limit=0` que o fluxo admin ainda envia.
   */
  async getAll(
    page: string | number | undefined,
    limit: string | number | undefined,
    dono: string,
  ) {
    const params = new URLSearchParams();
    if (page !== undefined && page !== '') params.set('page', String(page));
    if (limit !== undefined && limit !== '') params.set('limit', String(limit));
    params.set('dono', dono);
    return await this.axios.get(`v1/categoria?${params.toString()}`);
  }

  async getById(id: string) {
    return await this.axios.get(`v1/categoria/${id}`);
  }

  /**
   * ⚠️ O `dono` viaja no header `x-dono`, não no corpo. O corpo é escrito pelo
   * cliente; este header é escrito aqui, a partir do JWT.
   */
  async create(dto: CreateCategoriaDtoInput, dono: string) {
    return await this.axios.post('v1/categoria', dto, { 'x-dono': dono });
  }

  /**
   * ⚠️ O `x-dono` aqui não é redundante: é ele que permite ao ms recusar a
   * exclusão de categoria alheia.
   */
  async delete(id: string, dono: string) {
    return await this.axios.delete(`v1/categoria/${id}`, { 'x-dono': dono });
  }
}
