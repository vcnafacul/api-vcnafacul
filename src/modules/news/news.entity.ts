import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { User } from '../user/user.entity';

export type NewsContentType = 'file' | 'text';

@Entity('news')
export class News extends BaseEntity {
  @Column()
  title: string;

  @Column({ length: 280, nullable: true })
  description: string | null;

  @Column({ nullable: true })
  fileName: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({
    name: 'content_type',
    type: 'enum',
    enum: ['file', 'text'],
    default: 'file',
  })
  contentType: NewsContentType;

  @Column({ name: 'updated_by' })
  updatedBy: string;

  @Column({ default: true })
  actived: boolean;

  @Column({ default: false })
  destaque: boolean;

  @Column({ name: 'expire_at', type: 'date', nullable: true })
  expireAt: Date | null;

  @ManyToOne(() => User, (user) => user)
  @JoinColumn({ name: 'updated_by' })
  user: User;
}
