import { Column } from 'typeorm';
import { BaseEntity } from '../base/entity.base';

export class LinkedListEntity extends BaseEntity {
  @Column()
  head: boolean;

  @Column()
  prev?: number;

  @Column()
  next?: number;
}
