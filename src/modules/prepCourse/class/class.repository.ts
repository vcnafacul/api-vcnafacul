import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
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

  override async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<Class>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .leftJoin('entity.students', 'student_course')
        .addSelect('student_course.id')
        .getMany(),
      this.repository
        .createQueryBuilder('entity')
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }
}
