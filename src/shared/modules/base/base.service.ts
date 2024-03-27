import { IBaseRepository } from './interfaces/base.repository';
import { GetAllInput } from './interfaces/get-all.input';

export class BaseService<T> {
  protected readonly _repository: IBaseRepository<T>;
  constructor(repository: IBaseRepository<T>) {
    this._repository = repository;
  }

  async findAll({ page, limit }: GetAllInput) {
    return await this._repository.findAll({ page, limit });
  }

  async delete(id: number) {
    await this._repository.delete(id);
  }

  async findById(id: number) {
    return await this._repository.findOneBy({ id });
  }
}
