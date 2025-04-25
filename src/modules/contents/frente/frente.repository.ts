import { Injectable } from '@nestjs/common';
import { LinkedListRepository } from 'src/shared/modules/linked/linked-list.repository';
import { Frente } from './frente.entity';
import { Subject } from '../subject/subject.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Materias } from './enum/materias';
import { StatusContent } from '../content/enum/status-content';

@Injectable()
export class FrenteRepository extends LinkedListRepository<Frente, Subject> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager, Frente, Subject);
  }

  async getByMateria(materia: Materias) {
    const query = this.repository
      .createQueryBuilder('frente')
      .where('frente.materia = :materia', { materia });
    return query.getMany();
  }

  async getByMateriaContentApproved(materia: Materias) {
    const query = this.repository
      .createQueryBuilder('frente')
      .select([
        'frente.id',
        'frente.name',
        'frente.materia',
        'subject.id',
        'subject.name',
        'subject.description',
      ])
      .innerJoin('frente.subjects', 'subject')
      .innerJoin('subject.contents', 'content')
      .where('frente.materia = :materia', { materia })
      .andWhere('content.status = :status', { status: StatusContent.Approved });

    return query.getMany();
  }
}
