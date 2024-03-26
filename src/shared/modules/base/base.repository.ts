import { Repository } from 'typeorm';
import { GetAllInput } from './interfaces/get-all.input';
import { GetAllOutput } from './interfaces/get-all.output';

export class BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll({ page, limit }: GetAllInput): Promise<GetAllOutput<T>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
      this.repository.createQueryBuilder('entity').getCount(),
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

  async findBy(where: object): Promise<T[]> {
    return await this.repository.find({ where: { ...where } });
  }

  async findOneBy(where: object): Promise<T> {
    return await this.repository.findOne({ where: { ...where } });
  }

  async findOneOrFailBy(where: object): Promise<T> {
    return await this.repository.findOneByOrFail({ ...where });
  }

  async update(entity: T) {
    await this.repository.save(entity); //bloqquear o insert se não existir
  }

  async softDelete(id: number) {
    await this.repository.softDelete(id);
  }

  async delete(id: number) {
    await this.repository.delete(id);
  }
}
