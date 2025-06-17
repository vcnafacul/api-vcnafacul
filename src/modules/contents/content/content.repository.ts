import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { NodeRepository } from 'src/shared/modules/node/node.repository';
import { EntityManager } from 'typeorm';
import { Content } from './content.entity';
import { StatusContent } from './enum/status-content';
import { GetAllContentInput } from './interface/get-all-content.input';

@Injectable()
export class ContentRepository extends NodeRepository<Content> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Content));
  }

  override async findAllBy({
    page,
    limit,
    status,
    subjectId,
    materia,
    title,
  }: GetAllContentInput): Promise<GetAllOutput<Content>> {
    const query = this.repository
      .createQueryBuilder('demand')
      .skip((page - 1) * limit)
      .take(limit)
      .select([
        'demand.id',
        'demand.createdAt',
        'demand.updatedAt',
        'demand.status',
        'demand.title',
        'demand.description',
      ])
      .leftJoin('demand.subject', 'subject')
      .addSelect(['subject.id', 'subject.name', 'subject.description'])
      .leftJoin('subject.frente', 'frente')
      .addSelect(['frente.id', 'frente.name', 'frente.materia'])
      .leftJoinAndSelect('demand.files', 'files')
      .leftJoinAndSelect('demand.file', 'file')
      .orderBy('demand.createdAt', 'DESC');

    let whereApplied = false;
    if (status !== undefined) {
      query.where('demand.status = :status', { status });
      whereApplied = true;
    }

    if (subjectId) {
      if (whereApplied) {
        query.andWhere('subject.id = :subjectId', { subjectId });
      } else {
        query.where('subject.id = :subjectId', { subjectId });
      }
      whereApplied = true;
    }

    if (materia) {
      if (whereApplied) {
        query.andWhere('frente.materia = :materia', { materia });
      } else {
        query.where('frente.materia = :materia', { materia });
      }
      whereApplied = true;
    }

    if (title) {
      if (whereApplied) {
        query.andWhere('demand.title = :title', { title });
      } else {
        query.where('demand.title = :title', { title });
      }
    }

    const data = await query.getMany();
    const totalItems = await query.getCount();
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  async getBytSubject(subjectId: string) {
    const query = this.repository
      .createQueryBuilder('demand')
      .select([
        'demand.id',
        'demand.createdAt',
        'demand.updatedAt',
        'demand.status',
        'demand.title',
        'demand.description',
        'demand.next',
      ])
      .leftJoin('demand.subject', 'subject')
      .addSelect(['subject.id', 'subject.name', 'subject.description'])
      .leftJoin('subject.frente', 'frente')
      .addSelect(['frente.id', 'frente.name', 'frente.materia'])
      .leftJoinAndSelect('demand.file', 'file')
      .where('subject.id = :subjectId', { subjectId });

    return query.getMany();
  }

  async getByIdToRemove(id: string) {
    const query = this.repository
      .createQueryBuilder('content')
      .select(['content.id', 'content.next', 'content.prev'])
      .leftJoin('content.subject', 'subject')
      .addSelect(['subject.id', 'subject.name'])
      .leftJoinAndSelect('content.files', 'files')
      .where('content.id = :id', { id });

    return query.getOne();
  }

  async getOrderContent(
    nodes: Content[],
    start: string,
    status?: StatusContent,
  ) {
    const orderedNodes: Content[] = [];
    let currentNode = nodes.find((n) => n.id === start);

    while (currentNode) {
      orderedNodes.push(currentNode);
      currentNode = nodes.find((n) => n.id === currentNode.next);
    }

    if (status === undefined || Number.isNaN(status)) {
      return orderedNodes;
    }

    return orderedNodes.filter((node) => node.status === status);
  }

  async getNodes(list: string) {
    return this.repository.findBy({ list });
  }

  async IsUnique(subjectId: string, title: string) {
    const count = await this.repository
      .createQueryBuilder('demand')
      .select(['demand.id', 'demand.title'])
      .leftJoin('demand.subject', 'subject')
      .addSelect(['subject.id'])
      .where({ title })
      .andWhere('subject.id = :subjectId', { subjectId })
      .getCount();

    return count === 0;
  }

  async findByUpload(id: string): Promise<Content> {
    const query = this.repository
      .createQueryBuilder('content')
      .leftJoin('content.subject', 'subject')
      .addSelect(['subject.id', 'subject.name', 'subject.description'])
      .leftJoin('subject.frente', 'frente')
      .addSelect(['frente.id', 'frente.name', 'frente.materia'])
      .where('content.id = :id', { id });

    return query.getOne();
  }

  async findOneBy(where: object): Promise<Content> {
    const query = this.repository
      .createQueryBuilder('content')
      .leftJoin('content.subject', 'subject')
      .addSelect(['subject.id', 'subject.name', 'subject.description'])
      .leftJoin('subject.frente', 'frente')
      .addSelect(['frente.id', 'frente.name', 'frente.materia'])
      .leftJoinAndSelect('content.file', 'file')
      .leftJoinAndSelect('content.files', 'files')
      .where(where);

    return query.getOne();
  }

  async getTotalEntity() {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .getCount();
  }

  async entityByStatus(status: StatusContent) {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .andWhere('entity.status = :status', { status })
      .getCount();
  }
}
