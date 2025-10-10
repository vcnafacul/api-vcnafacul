import { Injectable } from '@nestjs/common';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { SectionDtoOutput } from './dtos/section-form.output';

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

  public async getSectionForm(
    query: GetAllDtoInput,
  ): Promise<GetAllOutput<SectionDtoOutput>> {
    let url = `v1/section`;
    const queryParams = Object.keys(query)
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    if (queryParams) {
      url = `${url}?${queryParams}`;
    }

    return await this.axios.get(url);
  }

  public async getSectionFormById(id: string) {
    return await this.axios.get(`v1/section/${id}`);
  }

  public async createSectionForm(dto: { name: string }) {
    return await this.axios.post(`v1/section`, dto);
  }

  public async setActiveSectionForm(id: string) {
    return await this.axios.patch(`v1/section/${id}/set-active`);
  }

  //delete section form
  public async deleteSectionForm(id: string) {
    return await this.axios.delete(`v1/section/${id}`);
  }
}
