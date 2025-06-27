import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { cleanString } from 'src/utils/cleanString';
import { User } from '../../user/user.entity';
import { FileContent } from '../file-content/file-content.entity';
import { FileContentRepository } from '../file-content/file-content.repository';
import { MateriasLabel } from '../frente/types/materiaLabel';
import { SubjectRepository } from '../subject/subject.repository';
import { Content } from './content.entity';
import { ContentRepository } from './content.repository';
import { CreateContentDTOInput } from './dtos/create-content.dto.input';
import { StatusContent } from './enum/status-content';
import { GetAllContentInput } from './interface/get-all-content.input';

@Injectable()
export class ContentService extends BaseService<Content> {
  constructor(
    private readonly repository: ContentRepository,
    private readonly subjectRepository: SubjectRepository,
    private readonly envService: EnvService,
    private readonly auditLog: AuditLogService,
    private readonly fileContentRepository: FileContentRepository,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly cache: CacheService,
  ) {
    super(repository);
  }

  async create(data: CreateContentDTOInput, user: User): Promise<Content> {
    if (!(await this.IsUnique(data.subjectId, data.title))) {
      throw new HttpException(
        'Já existe um conteúdo chamado "' + data.title + '" nessa tema.',
        HttpStatus.CONFLICT,
      );
    }

    const subject = await this.subjectRepository.getById(data.subjectId);
    if (!subject) {
      throw new HttpException(
        `Tema não encontrado com o ID ${data.subjectId}`,
        HttpStatus.NOT_FOUND,
      );
    }
    const content = new Content();
    content.title = data.title;
    content.subject = subject;
    content.description = data.description;
    content.user = user;
    const contentSave = await this.repository.create(content);
    await this.subjectRepository.addList(contentSave, subject);
    return contentSave;
  }

  override async findAllBy(
    query: GetAllContentInput,
  ): Promise<GetAllOutput<Content>> {
    return await this.repository.findAllBy(query);
  }

  async getAllOrder(subjectId: string, status?: StatusContent) {
    const subject = await this.subjectRepository.findOneBy({ id: subjectId });
    const nodes = await this.repository.getBytSubject(subjectId);
    return await this.repository.getOrderContent(nodes, subject.head, status);
  }

  public async getFile(id: string) {
    const file = await this.fileContentRepository.findOneBy({ id });
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
    return await this.blobService.getFile(
      file.fileKey,
      this.envService.get('BUCKET_CONTENT'),
    );
  }

  async getAllDemand(query: GetAllInput): Promise<GetAllOutput<Content>> {
    const demands = await this.repository.findAllBy({
      status: StatusContent.Pending_Upload,
      page: query.page,
      limit: query.limit,
    });
    if (!demands) {
      throw new HttpException('Não há demandas', HttpStatus.NO_CONTENT);
    }
    return demands;
  }

  async changeOrder(dto: ChangeOrderDTOInput) {
    await this.subjectRepository.changeOrder(dto.listId, dto.node1, dto.node2);
  }

  async changeStatus(id: string, status: StatusContent, user: User) {
    const demand = await this.repository.findOneBy({ id });
    demand.status = status;
    await this.repository.update(demand);
    await this.auditLog.create({
      entityType: 'Content',
      entityId: demand.id,
      updatedBy: user.id,
      changes: { message: `upload status to ${status}` },
    });
  }

  async reset(id: string, user: User) {
    const demand = await this.repository.findOneBy({ id });
    demand.status = StatusContent.Pending_Upload;
    demand.file = null;
    await this.repository.update(demand);
    await this.auditLog.create({
      entityType: 'Content',
      entityId: demand.id,
      updatedBy: user.id,
      changes: { message: `reset demand` },
    });
  }

  async uploadFile(id: string, user: User, file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('file not found', HttpStatus.BAD_REQUEST);
    }
    const demand = await this.repository.findByUpload(id);
    if (!demand) {
      throw new HttpException('demand not found', HttpStatus.NOT_FOUND);
    }
    const diretory = this.getDiretory(demand);
    const fileKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_CONTENT'),
      undefined,
      diretory,
    );
    if (!fileKey) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    const fileContent = new FileContent();
    fileContent.fileKey = fileKey;
    fileContent.originalName = file.originalname;
    fileContent.content = demand;
    fileContent.uploadedBy = user;
    const result = await this.fileContentRepository.create(fileContent);
    demand.status = StatusContent.Pending;
    demand.file = result;
    await this.repository.update(demand);
    await this.auditLog.create({
      entityType: 'Content',
      entityId: demand.id,
      updatedBy: user.id,
      changes: { message: `Upload file: ${fileKey}` },
    });
  }

  async delete(id: string) {
    const content = await this.repository.getByIdToRemove(id);
    if (!content) {
      throw new HttpException(
        `Content not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    for (const file of content.files) {
      await this.blobService.deleteFile(
        file.fileKey,
        this.envService.get('BUCKET_CONTENT'),
      );
      await this.fileContentRepository.delete(file.id);
    }
    await this.subjectRepository.removeNode(content.subject.id, content.id);
    await this.repository.delete(id);
  }

  async getSummary() {
    const contentSumission = await this.cache.wrap<number>(
      'content:total',
      async () => this.repository.getTotalEntity(),
    );
    const contentPending = await this.cache.wrap<number>(
      'content:pending',
      async () => this.repository.entityByStatus(StatusContent.Pending),
    );
    const contentApproved = await this.cache.wrap<number>(
      'content:approved',
      async () => this.repository.entityByStatus(StatusContent.Approved),
    );
    const contentRejected = await this.cache.wrap<number>(
      'content:rejected',
      async () => this.repository.entityByStatus(StatusContent.Rejected),
    );

    return {
      contentSumission,
      contentPending,
      contentApproved,
      contentRejected,
    };
  }

  private async IsUnique(subjectId: string, title: string) {
    return this.repository.IsUnique(subjectId, title);
  }

  private getDiretory(demand: Content) {
    const title = cleanString(demand.title);
    const subjectName = cleanString(demand.subject.name);
    const frenteName = cleanString(demand.subject.frente.name);
    const materiaName = cleanString(
      MateriasLabel.find((m) => m.value === demand.subject.frente.materia)
        .label,
    );
    return `${materiaName}/${frenteName}/${subjectName}/${title}`;
  }
}
