import { Column } from 'typeorm';
import { BaseEntity } from '../base/entity.base';

export abstract class NodeEntity extends BaseEntity {
  @Column({ nullable: true })
  prev?: string;

  @Column({ nullable: true })
  next?: string;

  abstract get list(): string;
}
