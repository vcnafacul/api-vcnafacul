import { GetAllInput } from './get-all.input';
import { GetAllOutput } from './get-all.output';

export interface IBaseRepository<T> {
  findAllBy({ page, limit }: GetAllInput): Promise<GetAllOutput<T>>;
  create(entity: T): Promise<T>;
  findOneBy(where: object): Promise<T>;
  findOneOrFailBy(where: object): Promise<T>;
  update(entity: T): Promise<void>;
  softDelete(id: number): Promise<void>;
  delete(id: number): Promise<void>;
}
