import { NotFoundException } from '@nestjs/common';
import { IBaseRepository } from './interfaces/base.repository';
import { GetAllInput } from './interfaces/get-all.input';
import { GetAllOutput } from './interfaces/get-all.output';

export class BaseService<T> {
  protected readonly _repository: IBaseRepository<T>;
  constructor(repository: IBaseRepository<T>) {
    this._repository = repository;
  }

  async findAllBy({
    page,
    limit,
    ...rest
  }: GetAllInput): Promise<GetAllOutput<T>> {
    return await this._repository.findAllBy({
      page,
      limit,
      where: { ...rest },
    });
  }

  async delete(id: number) {
    await this._repository.delete(id);
  }

  async findOneBy(filter: object) {
    const entity = await this._repository.findOneBy(filter);
    if (!entity) {
      throw new NotFoundException();
    }
    return entity;
  }
}
