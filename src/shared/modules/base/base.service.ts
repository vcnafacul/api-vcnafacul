import { IBaseRepository } from './interfaces/base.repository';
import { GetAllWhereInput } from './interfaces/get-all.input';
import { GetAllOutput } from './interfaces/get-all.output';

export class BaseService<T> {
  protected readonly _repository: IBaseRepository<T>;
  constructor(repository: IBaseRepository<T>) {
    this._repository = repository;
  }

  async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<T>> {
    return await this._repository.findAllBy({
      page,
      limit,
      where,
    });
  }

  async delete(id: string) {
    await this._repository.delete(id);
  }

  async findOneBy(filter: object) {
    const entity = await this._repository.findOneBy(filter);
    return entity;
  }
}
