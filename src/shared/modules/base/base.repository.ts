import { Repository } from 'typeorm';

export class BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(): Promise<T[]> {
    return await this.repository.find();
  }
}
