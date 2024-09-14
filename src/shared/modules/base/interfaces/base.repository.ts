import { GetAllWhereInput } from './get-all.input';
import { GetAllOutput } from './get-all.output';

export interface IBaseRepository<T> {
  findAllBy({ page, limit, where }: GetAllWhereInput): Promise<GetAllOutput<T>>;
  create(entity: T): Promise<T>;
  findOneBy(where: object): Promise<T>;
  findOneOrFailBy(where: object): Promise<T>;
  update(entity: T): Promise<void>;
  softDelete(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
