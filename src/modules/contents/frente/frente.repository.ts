import { Injectable } from '@nestjs/common';
import { LinkedListRepository } from 'src/shared/modules/linked/linked-list.repository';
import { Frente } from './frente.entity';
import { Subject } from '../subject/subject.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Materias } from './enum/materias';

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
      .select(['frente.id', 'frente.name', 'frente.lenght'])
      .where('frente.materia = :materia', { materia })
      .andWhere('frente.lenght > 0');

    return query.getMany();
  }
}
