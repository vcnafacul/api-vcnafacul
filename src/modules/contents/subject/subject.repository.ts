import { Injectable } from '@nestjs/common';
import { LinkedListRepository } from 'src/shared/modules/linked/linked-list.repository';
import { Subject } from '../subject/subject.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Content } from '../content/content.entity';

@Injectable()
export class SubjectRepository extends LinkedListRepository<Subject, Content> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager, Subject, Content);
  }

  async getByFrente(frente: number) {
    const query = this.repository
      .createQueryBuilder('subject')
      .select([
        'subject.id',
        'subject.name',
        'subject.description',
        'subject.lenght',
      ])
      .leftJoin('subject.frente', 'frente')
      .addSelect(['frente.id'])
      .where('frente.id = :frente', { frente });

    return query.getMany();
  }

  async getById(id: number) {
    const query = this.repository
      .createQueryBuilder('subject')
      .select([
        'subject.id',
        'subject.name',
        'subject.head',
        'subject.tail',
        'subject.lenght',
      ])
      .leftJoin('subject.frente', 'frente')
      .addSelect(['frente.id', 'frente.name', 'frente.lenght'])
      .where('subject.id = :id', { id });

    return query.getOne();
  }

  async getByIdToRemove(id: number) {
    const query = this.repository
      .createQueryBuilder('subject')
      .select(['subject.id', 'subject.next', 'subject.prev'])
      .leftJoin('subject.frente', 'frente')
      .addSelect(['frente.id', 'frente.name'])
      .where('subject.id = :id', { id });

    return query.getOne();
  }
}
