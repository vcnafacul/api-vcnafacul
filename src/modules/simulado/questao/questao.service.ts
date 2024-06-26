import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { User } from 'src/modules/user/user.entity';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { CreateQuestaoDTOInput } from '../dtos/create-questao.dto.input';
import { QuestaoDTOInput } from '../dtos/questao.dto.input';
import { UpdateDTOInput } from '../dtos/update-questao.dto.input';
import { Status } from '../enum/status.enum';

@Injectable()
export class QuestaoService {
  constructor(
    private readonly axios: HttpServiceAxios,
    private readonly configService: ConfigService,
    private readonly auditLod: AuditLogService,
  ) {
    this.axios.setBaseURL(this.configService.get<string>('SIMULADO_URL'));
  }

  public async getAllQuestoes(query: QuestaoDTOInput) {
    let baseUrl = 'v1/questao?';

    Object.keys(query).forEach((key) => {
      baseUrl = baseUrl + `${key}=${query[key]}&`;
    });

    return await this.axios.get(baseUrl);
  }

  public async questoesInfo() {
    return await this.axios.get(`v1/questao/infos`);
  }

  public async questoesUpdateStatus(
    id: string,
    status: Status,
    user: User,
    message?: string,
  ) {
    return await this.axios.patch(`v1/questao/${id}/${status}`, {
      message,
      userId: user.id,
    });
  }

  public async questoesUpdate(questao: UpdateDTOInput) {
    return await this.axios.patch(`v1/questao`, questao);
  }

  public async createQuestion(questao: CreateQuestaoDTOInput) {
    return await this.axios.postR(`v1/questao`, questao);
  }

  public async uploadImage(file: any): Promise<string> {
    if (!file) {
      throw new Error('Nenhum arquivo fornecido');
    }
    return file.filename.split('.')[0];
  }

  public async delete(id: string) {
    await this.axios.delete(`v1/questao/${id}`);
  }
}
