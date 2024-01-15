import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { CreateContentDTOInput } from './dtos/create-content.dto.input';
import { ContentRepository } from './content.repository';
import { SubjectRepository } from '../subject/subject.repository';
import { Content } from './content.entity';
import { StatusContent } from './enum/status-content';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';
import { User } from '../../user/user.entity';
import { removeFileFTP } from 'src/utils/removeFileFtp';

@Injectable()
export class ContentService {
  constructor(
    private readonly repository: ContentRepository,
    private readonly subjectRepository: SubjectRepository,
    private readonly configService: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

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

  async getAll(subjectId?: number, status?: StatusContent) {
    return await this.repository.getAll(status, subjectId);
  }

  async getAllOrder(subjectId: number, status?: StatusContent) {
    const subject = await this.subjectRepository.findOneBy({ id: subjectId });
    const nodes = await this.repository.getBytSubject(subjectId);
    return await this.repository.getOrderContent(nodes, subject.head, status);
  }

  async getById(id: number) {
    return this.repository.findBy({ id });
  }

  async getAllDemand() {
    const demands = await this.repository.getAll(StatusContent.Pending_Upload);
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
    const removed = await removeFileFTP(
      demand.filename,
      this.configService.get<string>('FTP_HOST'),
      this.configService.get<string>('FTP_USER'),
      this.configService.get<string>('FTP_PASSWORD'),
    );
    if (!removed) {
      throw new HttpException('Erro to try remove File', HttpStatus.NOT_FOUND);
    }
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
    const demand = await this.repository.findOneBy({ id });
    if (!demand) {
      throw new HttpException('demand not found', HttpStatus.NOT_FOUND);
    }
    const fileName = await uploadFileFTP(
      file,
      this.configService.get<string>('FTP_TEMP_FILE'),
      this.configService.get<string>('FTP_HOST'),
      this.configService.get<string>('FTP_USER'),
      this.configService.get<string>('FTP_PASSWORD'),
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
    const content = await this.repository.getAll(undefined, subjectId, title);
    return content.length === 0;
  }
}
