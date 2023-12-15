import { Repository } from 'typeorm';
import { BaseRepository } from '../base/base.repository';

export class LinkedListRepository<T> extends BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {
    super(repository);
  }
}
