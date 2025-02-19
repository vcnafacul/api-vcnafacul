import { Repository } from 'typeorm';
import { IBaseRepository } from './interfaces/base.repository';
import { GetAllWhereInput } from './interfaces/get-all.input';
import { GetAllOutput } from './interfaces/get-all.output';

export class BaseRepository<T> implements IBaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<T>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
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

  async create(entity: T): Promise<T> {
    const newEntity = this.repository.create(entity);
    await this.repository.save(newEntity);
    return newEntity;
  }

  async findOneBy(where: object): Promise<T> {
    return await this.repository.findOne({ where: { ...where } });
  }

  async findOneOrFailBy(where: object): Promise<T> {
    return await this.repository.findOneByOrFail({ ...where });
  }

  async update(entity: T): Promise<void> {
    await this.repository.save(entity); //bloqquear o insert se não existir
  }

  async softDelete(id: string) {
    await this.repository.softDelete(id);
  }

  async delete(id: string) {
    await this.repository.delete(id);
  }
}
