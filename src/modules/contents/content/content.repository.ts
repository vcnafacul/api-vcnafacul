import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { NodeRepository } from 'src/shared/modules/node/node.repository';
import { Content } from './content.entity';
import { StatusContent } from './enum/status-content';

@Injectable()
export class ContentRepository extends NodeRepository<Content> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Content));
  }

  async getAll(status?: StatusContent, subjectId?: number, title?: string) {
    const query = this.repository
      .createQueryBuilder('demand')
      .select([
        'demand.id',
        'demand.createdAt',
        'demand.updatedAt',
        'demand.status',
        'demand.title',
        'demand.description',
        'demand.filename',
      ])
      .leftJoin('demand.subject', 'subject')
      .addSelect(['subject.id', 'subject.name', 'subject.description'])
      .leftJoin('subject.frente', 'frente')
      .addSelect(['frente.id', 'frente.name', 'frente.materia']);

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
    }

    if (title) {
      if (whereApplied) {
        query.andWhere('demand.title = :title', { title });
      } else {
        query.where('demand.title = :title', { title });
      }
    }

    return query.getMany();
  }

  async getByIdToRemove(id: number) {
    const query = this.repository
      .createQueryBuilder('content')
      .select(['content.id', 'content.next', 'content.prev'])
      .leftJoin('content.subject', 'subject')
      .addSelect(['subject.id', 'subject.name'])
      .where('content.id = :id', { id });

    return query.getOne();
  }
}
