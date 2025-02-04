import { Injectable } from '@nestjs/common';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { User } from 'src/modules/user/user.entity';
import { UserService } from 'src/modules/user/user.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { CreateQuestaoDTOInput } from '../dtos/create-questao.dto.input';
import {
  AuditLogMSDTO,
  HistoryQuestionDTOOutput,
} from '../dtos/history-question.dto.output';
import { QuestaoDTOInput } from '../dtos/questao.dto.input';
import { UpdateDTOInput } from '../dtos/update-questao.dto.input';
import { Status } from '../enum/status.enum';

@Injectable()
export class QuestaoService {
  constructor(
    private readonly axios: HttpServiceAxios,
    private readonly env: EnvService,
    private readonly auditLod: AuditLogService,
    private readonly userService: UserService,
  ) {
    this.axios.setBaseURL(this.env.get('SIMULADO_URL'));
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

  public async getHistory(id: string): Promise<HistoryQuestionDTOOutput> {
    const history = await this.auditLod.getMSByEntityId(id);

    const users: User[] = [];

    const historyDTO: AuditLogMSDTO[] = await Promise.all(
      history.map(async (item) => {
        let user = users.find((u) => u.id === item.user);
        if (!user) {
          user = await this.userService.findUserById(item.user);
          users.push(user);
        }
        return {
          user: {
            id: user.id,
            name: user.firstName + ' ' + user.lastName,
            email: user.email,
          },
          entityId: item.entityId,
          changes: item.changes,
          entityType: item.entityType,
          createdAt: item.createdAt,
        };
      }),
    );

    const create = historyDTO?.reduce((prev, current) =>
      prev.createdAt < current.createdAt ? prev : current,
    );

    return {
      user: {
        id: create?.user.id,
        name: create?.user.name,
        email: create?.user.email,
      },
      createdAt: create?.createdAt,
      history: historyDTO,
    };
  }
}
