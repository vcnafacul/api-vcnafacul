import { IBaseRepository } from './interfaces/base.repository';
import { GetAllInput } from './interfaces/get-all.input';

export class BaseService<T> {
  protected readonly _repository: IBaseRepository<T>;
  constructor(repository: IBaseRepository<T>) {
    this._repository = repository;
  }

  async findAllBy({ page, limit, where }: GetAllInput) {
    return await this._repository.findAllBy({ page, limit, where });
  }

  async delete(id: number) {
    await this._repository.delete(id);
  }

  async findOneBy(filter: object) {
    return await this._repository.findOneBy(filter);
  }
}
