import { Column } from 'typeorm';
import { NodeEntity } from '../node/node.entity';

export abstract class LinkedListEntity extends NodeEntity {
  @Column({ nullable: true })
  head?: string;

  @Column({ nullable: true })
  tail?: string;

  @Column({ default: 0 })
  lenght: number;
}
