import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { BaseEntity } from '../../shared/modules/base/entity.base';

@Entity('news')
export class News extends BaseEntity {
  @Column()
  session: string;

  @Column()
  title: string;

  @Column()
  fileName: string;

  @Column({ name: 'updated_by' })
  updatedBy: number;

  @ManyToOne(() => User, (user) => user)
  @JoinColumn({ name: 'updated_by' })
  user: User;
}
