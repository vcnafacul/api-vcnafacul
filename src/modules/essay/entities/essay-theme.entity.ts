import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';

@Entity('essay_themes')
export class EssayTheme extends BaseEntity {
  @Column({ length: 200 })
  title: string;

  @Column({ name: 'motivational_text', type: 'text' })
  motivationalText: string;

  @Column({ type: 'text', nullable: true })
  instruction: string;

  @Column({ name: 'week_start', type: 'date' })
  weekStart: Date;

  @Column({ name: 'week_end', type: 'date' })
  weekEnd: Date;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
