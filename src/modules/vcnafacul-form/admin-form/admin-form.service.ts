import { Injectable } from '@nestjs/common';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class AdminFormService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('FORMULARIO_URL'),
    );
  }

  private get adminHeaders(): Record<string, string> {
    return {
      'X-Owner-Type': 'GLOBAL',
      'X-Admin-Context': this.envService.get('ADMIN_FORM_SECRET'),
    };
  }

  // --- Form ---

  public async getGlobalForm() {
    return await this.axios.get(`v1/form?ownerType=GLOBAL`);
  }

  public async createGlobalForm(dto: { name: string }) {
    return await this.axios.post(
      `v1/form`,
      { ...dto, ownerType: 'GLOBAL' },
      this.adminHeaders,
    );
  }

  public async setActiveForm(id: string) {
    return await this.axios.patch(
      `v1/form/${id}/set-active`,
      undefined,
      this.adminHeaders,
    );
  }

  public async getFormById(id: string) {
    return await this.axios.get(`v1/form/${id}`);
  }

  // --- Sections ---

  public async getSections(query: GetAllDtoInput) {
    let url = `v1/section`;
    const queryParams = Object.keys(query)
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    if (queryParams) url = `${url}?${queryParams}`;
    return await this.axios.get(url, this.adminHeaders);
  }

  public async getSectionById(id: string) {
    return await this.axios.get(`v1/section/${id}`);
  }

  public async createSection(dto: { name: string; description?: string }) {
    return await this.axios.post(`v1/section`, dto, this.adminHeaders);
  }

  public async setActiveSection(id: string) {
    return await this.axios.patch(
      `v1/section/${id}/set-active`,
      undefined,
      this.adminHeaders,
    );
  }

  public async deleteSection(id: string) {
    return await this.axios.delete(
      `v1/section/${id}`,
      this.adminHeaders,
    );
  }

  public async updateSection(id: string, dto: { name: string; description?: string }) {
    return await this.axios.patch(
      `v1/section/${id}`,
      dto,
      this.adminHeaders,
    );
  }

  public async reorderQuestions(id: string, dto: any) {
    return await this.axios.patch(
      `v1/section/${id}/reorder`,
      dto,
      this.adminHeaders,
    );
  }

  public async duplicateSection(id: string) {
    return await this.axios.post(
      `v1/section/${id}/duplicate`,
      undefined,
      this.adminHeaders,
    );
  }

  // --- Questions ---

  public async createQuestion(dto: any) {
    return await this.axios.post(`v1/question`, dto, this.adminHeaders);
  }

  public async updateQuestion(id: string, dto: any) {
    return await this.axios.put(
      `v1/question/${id}`,
      dto,
      this.adminHeaders,
    );
  }

  public async deleteQuestion(id: string) {
    return await this.axios.delete(
      `v1/question/${id}`,
      this.adminHeaders,
    );
  }

  public async setActiveQuestion(id: string) {
    return await this.axios.patch(
      `v1/question/${id}/set-active`,
      undefined,
      this.adminHeaders,
    );
  }
}
