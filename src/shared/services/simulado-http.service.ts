import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class SimuladoHttpService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async listUserGroupAggregates(groupId: string): Promise<any[]> {
    return this.axios.get(`v1/user-group-aggregates?groupId=${groupId}&groupType=class`);
  }

  async getUserGroupAggregateByMonth(
    groupId: string,
    month: string,
  ): Promise<any | null> {
    try {
      return await this.axios.get(
        `v1/user-group-aggregates/by-month?groupId=${groupId}&groupType=class&month=${month}`,
      );
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404) return null;
      throw err;
    }
  }

  async calculateUserGroupAggregate(payload: {
    groupId: string;
    month: string;
    monthStart: Date;
    monthEnd: Date;
    userIds: string[];
  }): Promise<any> {
    return this.axios.post(`v1/user-group-aggregates/calculate`, {
      groupType: 'class',
      ...payload,
    });
  }
}
