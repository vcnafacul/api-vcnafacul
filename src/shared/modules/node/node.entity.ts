import { Column } from 'typeorm';
import { BaseEntity } from '../base/entity.base';

export abstract class NodeEntity extends BaseEntity {
  @Column({ nullable: true })
  prev?: number;

  @Column({ nullable: true })
  next?: number;

  abstract get list(): number;
}
