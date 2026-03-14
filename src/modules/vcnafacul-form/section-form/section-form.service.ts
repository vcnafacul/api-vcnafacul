import { Injectable } from '@nestjs/common';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class SectionFormService {
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

  public async getSectionForm(
    query: GetAllDtoInput,
    partnerId: string,
  ): Promise<unknown> {
    let url = `v1/section`;
    const queryParams = Object.keys(query)
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    if (queryParams) {
      url = `${url}?${queryParams}`;
    }

    return await this.axios.get(url, this.partnerHeaders(partnerId));
  }

  public async getSectionFormById(id: string) {
    return await this.axios.get(`v1/section/${id}`);
  }

  public async createSectionForm(dto: { name: string; description?: string }, partnerId: string) {
    return await this.axios.post(
      `v1/section`,
      dto,
      this.partnerHeaders(partnerId),
    );
  }

  public async setActiveSectionForm(id: string, partnerId: string) {
    return await this.axios.patch(
      `v1/section/${id}/set-active`,
      undefined,
      this.partnerHeaders(partnerId),
    );
  }

  public async deleteSectionForm(id: string, partnerId: string) {
    return await this.axios.delete(
      `v1/section/${id}`,
      this.partnerHeaders(partnerId),
    );
  }

  public async updateSectionForm(
    id: string,
    dto: { name: string; description?: string },
    partnerId: string,
  ) {
    return await this.axios.patch(
      `v1/section/${id}`,
      dto,
      this.partnerHeaders(partnerId),
    );
  }

  public async reorderQuestionsSectionForm(
    id: string,
    dto: any,
    partnerId: string,
  ) {
    await this.axios.patch(
      `v1/section/${id}/reorder`,
      dto,
      this.partnerHeaders(partnerId),
    );
  }

  public async duplicateSection(id: string, partnerId: string) {
    return await this.axios.post(
      `v1/section/${id}/duplicate`,
      undefined,
      this.partnerHeaders(partnerId),
    );
  }
}
