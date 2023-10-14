import { Repository } from 'typeorm';

export class BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(): Promise<T[]> {
    return await this.repository.find();
  }

  async create(entity: T): Promise<T> {
    const newEntity = this.repository.create(entity);
    await this.repository.save(newEntity);
    return newEntity;
  }

  async findBy(where: object): Promise<T[]> {
    return await this.repository.find({ where: { ...where } });
  }
}
