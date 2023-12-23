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
