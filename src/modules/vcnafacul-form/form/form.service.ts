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
  public async createFormFull(inscriptionId: string, partnerId: string) {
    return await this.axios.post(`v1/form/${inscriptionId}/create-form-full`, {
      partnerId,
    });
  }

  //@Get has-active-form
  public async hasActiveForm(partnerId: string): Promise<boolean> {
    return await this.axios.get(`v1/form/has-active?partnerId=${partnerId}`);
  }

  public async createPartnerForm(partnerId: string) {
    return await this.axios.post(
      `v1/form`,
      { name: 'Formulário do Cursinho', ownerType: 'PARTNER' },
      {
        'X-Owner-Type': 'PARTNER',
        'X-Owner-Id': partnerId,
      },
    );
  }
}
