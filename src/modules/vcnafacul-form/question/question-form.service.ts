import { Injectable } from '@nestjs/common';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class QuestionFormService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('FORMULARIO_URL'),
    );
  }

  private partnerHeaders(partnerId: string): Record<string, string> {
    return {
      'X-Owner-Type': 'PARTNER',
      'X-Owner-Id': partnerId,
    };
  }

  public async getQuestionForm(query: GetAllDtoInput) {
    let url = `v1/question`;
    const queryParams = Object.keys(query)
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    if (queryParams) {
      url = `${url}?${queryParams}`;
    }

    return await this.axios.get(url);
  }

  public async getQuestionFormById(id: string) {
    return await this.axios.get(`v1/question/${id}`);
  }

  public async createQuestionForm(dto: any, partnerId: string) {
    return await this.axios.post(
      `v1/question`,
      dto,
      this.partnerHeaders(partnerId),
    );
  }

  public async setActiveQuestionForm(id: string, partnerId: string) {
    await this.axios.patch(
      `v1/question/${id}/set-active`,
      undefined,
      this.partnerHeaders(partnerId),
    );
  }

  public async deleteQuestionForm(id: string, partnerId: string) {
    return await this.axios.delete(
      `v1/question/${id}`,
      this.partnerHeaders(partnerId),
    );
  }

  public async updateQuestionForm(
    id: string,
    dto: unknown,
    partnerId: string,
  ) {
    return await this.axios.put(
      `v1/question/${id}`,
      dto,
      this.partnerHeaders(partnerId),
    );
  }
}
