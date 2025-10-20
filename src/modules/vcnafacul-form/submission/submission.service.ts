import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { CreateSubmissionDtoInput } from './dto/create-submission.dto.input';

@Injectable()
export class SubmissionService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('FORMULARIO_URL'),
    );
  }

  public async createSubmission(dto: CreateSubmissionDtoInput) {
    return await this.axios.post(`v1/submission`, dto);
  }
}
