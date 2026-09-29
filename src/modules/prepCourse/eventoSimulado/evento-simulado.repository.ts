import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { EventoSimulado } from './evento-simulado.entity';

@Injectable()
export class EventoSimuladoRepository extends BaseRepository<EventoSimulado> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(EventoSimulado));
  }
}
