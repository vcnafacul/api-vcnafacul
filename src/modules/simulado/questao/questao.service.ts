import { Inject, Injectable } from '@nestjs/common';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { User } from 'src/modules/user/user.entity';
import { UserService } from 'src/modules/user/user.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CreateQuestaoMsSimuladoDTOInput } from '../dtos/create-questao-mssimulado.dto.input';
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
  private readonly axios: HttpServiceAxios;

  constructor(
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private envService: EnvService,
    private readonly auditLod: AuditLogService,
    private readonly userService: UserService,
    private readonly cache: CacheService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  // getbyId
  public async getById(id: string) {
    return await this.axios.get(`v1/questao/${id}`);
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
    const questSend = questao as CreateQuestaoMsSimuladoDTOInput;

    return await this.axios.post(`v1/questao`, questSend);
  }

  public async uploadImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      throw new Error('Nenhum arquivo fornecido');
    }
    const fileKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_QUESTION'),
    );

    // Atualiza o imageId no endpoint se o id for fornecido
    await this.axios.patch(`v1/questao/${id}/image-id`, {
      imageId: fileKey,
    });

    return fileKey;
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

  public async getImage(id: string) {
    // ttl 1 ano
    return await this.cache.wrap<{ buffer: string; contentType: string }>(
      `questao:image:${id}`,
      async () =>
        await this.blobService.getFile(
          id,
          this.envService.get('BUCKET_QUESTION'),
        ),
      60 * 60 * 24 * 1000 * 7,
    );
  }

  public async getSummary() {
    return this.cache.wrap<object>(
      'questao',
      async () => await this.axios.get<any>(`v1/questao/summary`),
    );
  }

  public async updateClassificacao(id: string, body: unknown) {
    return await this.axios.patch<any>(`v1/questao/${id}/classification`, body);
  }

  public async updateContent(id: string, body: unknown) {
    return await this.axios.patch<any>(`v1/questao/${id}/content`, body);
  }

  public async updateImageAlternativa(
    id: string,
    file: Express.Multer.File,
    alternativa: string,
  ) {
    let imageAlternativa: string | null = null;

    if (file) {
      imageAlternativa = await this.blobService.uploadFile(
        file,
        this.envService.get('BUCKET_QUESTION'),
      );
    }

    if (imageAlternativa) {
      await this.axios.patch(`v1/questao/${id}/image-alternativa`, {
        imageAlternativa,
        alternativa,
      });
    }

    return imageAlternativa;
  }

  public async getLogs(id: string) {
    const logs = (await this.axios.get(`v1/questao/${id}/logs`)) as any[];
    if (logs.length === 0) {
      return [];
    }

    const users: User[] = [];

    const logsWithUserInfo = await Promise.all(
      logs.map(async (item) => {
        let user = users.find((u) => u.id === item.user);
        if (!user) {
          user = await this.userService.findUserById(item.user);
          if (!user) {
            return {
              ...item,
              user: {
                id: item.user,
                name: 'Desconhecido',
                email: 'Desconhecido',
              },
            };
          }
          users.push(user);
        }
        return {
          ...item,
          user: {
            id: user.id,
            name: user.firstName + ' ' + user.lastName,
            email: user.email,
          },
        };
      }),
    );

    return logsWithUserInfo;
  }
}
