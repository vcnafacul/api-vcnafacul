import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { User } from '../user/user.entity';

@Entity('news')
export class News extends BaseEntity {
  @Column()
  session: string;

  @Column()
  title: string;

  @Column()
  fileName: string;

  @Column({ name: 'updated_by' })
  updatedBy: string;

  @Column({ default: true })
  actived: boolean;

  @Column({ name: 'expire_at', type: 'date', nullable: true })
  expireAt: Date | null;

  @ManyToOne(() => User, (user) => user)
  @JoinColumn({ name: 'updated_by' })
  user: User;
}
