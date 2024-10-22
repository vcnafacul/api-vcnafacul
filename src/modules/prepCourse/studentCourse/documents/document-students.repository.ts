import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { DocumentStudent } from './document-students.entity';

@Injectable()
export class DocumentStudentRepository extends BaseRepository<DocumentStudent> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(DocumentStudent));
  }
}
