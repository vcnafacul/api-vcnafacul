import { Column } from 'typeorm';
import { NodeEntity } from '../node/node.entity';

export abstract class LinkedListEntity extends NodeEntity {
  @Column({ nullable: true })
  head?: number;

  @Column({ nullable: true })
  tail?: number;

  @Column({ default: 0 })
  lenght: number;
}
