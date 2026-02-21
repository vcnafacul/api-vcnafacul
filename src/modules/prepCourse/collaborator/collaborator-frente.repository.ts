import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { CollaboratorFrente } from './collaborator-frente.entity';

@Injectable()
export class CollaboratorFrenteRepository extends BaseRepository<CollaboratorFrente> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(CollaboratorFrente));
  }

  async findByCollaboratorId(
    collaboratorId: string,
  ): Promise<CollaboratorFrente[]> {
    return this.repository.find({ where: { collaboratorId } });
  }

  async deleteByCollaboratorId(collaboratorId: string): Promise<void> {
    await this.repository.delete({ collaboratorId });
  }

  async createMany(
    entities: CollaboratorFrente[],
  ): Promise<CollaboratorFrente[]> {
    return this.repository.save(entities);
  }
}
