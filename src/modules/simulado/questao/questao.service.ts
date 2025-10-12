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

  public async createQuestion(
    questao: CreateQuestaoDTOInput,
    fileContents: Express.Multer.File[],
    imageId?: Express.Multer.File,
    altA?: Express.Multer.File,
    altB?: Express.Multer.File,
    altC?: Express.Multer.File,
    altD?: Express.Multer.File,
    altE?: Express.Multer.File,
  ) {
    const questSend = questao as CreateQuestaoMsSimuladoDTOInput;
    if (fileContents.length > 0) {
      const files: string[] = [];
      for (const file of fileContents) {
        const fileKey = await this.uploadImage(file);
        files.push(fileKey);
      }
      questSend.files = files;
    }
    if (imageId) {
      questSend.imageId = await this.uploadImage(imageId);
    }
    if (altA) {
      questSend.altA = await this.uploadImage(altA);
    }
    if (altB) {
      questSend.altB = await this.uploadImage(altB);
    }
    if (altC) {
      questSend.altC = await this.uploadImage(altC);
    }
    if (altD) {
      questSend.altD = await this.uploadImage(altD);
    }
    if (altE) {
      questSend.altE = await this.uploadImage(altE);
      return await this.axios.post(`v1/questao`, questSend);
    }
  }

  public async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new Error('Nenhum arquivo fornecido');
    }
    const fileKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_QUESTION'),
    );
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
    return await this.blobService.getFile(
      `${id}.png`,
      this.envService.get('BUCKET_QUESTION'),
    );
  }

  public async getSummary() {
    return this.cache.wrap<object>(
      'questao',
      async () => await this.axios.get<any>(`v1/questao/summary`),
    );
  }
}
