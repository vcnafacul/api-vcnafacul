import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { cleanString } from 'src/utils/cleanString';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';
import { User } from '../../user/user.entity';
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
    private readonly configService: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {
    super(repository);
  }

  async create(data: CreateContentDTOInput): Promise<Content> {
    if (!(await this.IsUnique(data.subjectId, data.title))) {
      throw new HttpException(
        'Já existe um Título para esse Tema',
        HttpStatus.CONFLICT,
      );
    }

    const subject = await this.subjectRepository.getById(data.subjectId);
    if (!subject) {
      throw new HttpException(
        `Subject not found by Id ${data.subjectId}`,
        HttpStatus.NOT_FOUND,
      );
    }
    const content = new Content();
    content.title = data.title;
    content.subject = subject;
    content.description = data.description;
    const contentSave = await this.repository.create(content);
    await this.subjectRepository.addList(contentSave, subject);
    return contentSave;
  }

  override async findAllBy(
    query: GetAllContentInput,
  ): Promise<GetAllOutput<Content>> {
    return await this.repository.findAllBy(query);
  }

  async getAllOrder(subjectId: number, status?: StatusContent) {
    const subject = await this.subjectRepository.findOneBy({ id: subjectId });
    const nodes = await this.repository.getBytSubject(subjectId);
    return await this.repository.getOrderContent(nodes, subject.head, status);
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
    await this.subjectRepository.changeOrder(
      dto.listId,
      dto.node1,
      dto.node2,
      dto.where,
    );
  }

  async changeStatus(id: number, status: StatusContent, user: User) {
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

  async reset(id: number, user: User) {
    const demand = await this.repository.findOneBy({ id });
    demand.status = StatusContent.Pending_Upload;
    demand.filename = null;
    await this.repository.update(demand);
    await this.auditLog.create({
      entityType: 'Content',
      entityId: demand.id,
      updatedBy: user.id,
      changes: { message: `reset demand` },
    });
  }

  async uploadFile(id: number, user: User, file: any) {
    const demand = await this.repository.findByUpload(id);
    if (!demand) {
      throw new HttpException('demand not found', HttpStatus.NOT_FOUND);
    }
    const diretory = this.getDiretory(demand);
    const fileName = await uploadFileFTP(
      file,
      this.configService.get<string>('FTP_TEMP_FILE'),
      this.configService.get<string>('FTP_HOST'),
      this.configService.get<string>('FTP_CONTENT'),
      this.configService.get<string>('FTP_PASSWORD'),
      diretory,
    );
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    demand.status = StatusContent.Pending;
    demand.filename = fileName;
    demand.user = user;
    await this.repository.update(demand);
    await this.auditLog.create({
      entityType: 'Content',
      entityId: demand.id,
      updatedBy: user.id,
      changes: { message: `Upload file: ${fileName}` },
    });
  }

  async delete(id: number) {
    const content = await this.repository.getByIdToRemove(id);
    if (!content) {
      throw new HttpException(
        `Content not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    await this.subjectRepository.removeNode(content.subject.id, content.id);
    await this.repository.delete(id);
  }

  private async IsUnique(subjectId: number, title: string) {
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
