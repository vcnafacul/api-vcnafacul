import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class FormService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('FORMULARIO_URL'),
    );
  }

  //getFormByInscriptionId
  public async getFormFullByInscriptionId(inscriptionId: string) {
    return await this.axios.get(`v1/form-full/${inscriptionId}/inscription`);
  }

  //@Post(':inscriptionId/create-form-full')
  public async createFormFull(inscriptionId: string) {
    return await this.axios.post(`v1/form/${inscriptionId}/create-form-full`);
  }
}
