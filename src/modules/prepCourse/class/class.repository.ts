import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { Class } from './class.entity';

@Injectable()
export class ClassRepository extends BaseRepository<Class> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Class));
  }

  async delete(id: string): Promise<void> {
    const classEntity = await this.repository.findOneBy({ id });
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    classEntity.deletedAt = new Date();
    await this.repository.save(classEntity);
  }
}
