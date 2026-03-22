import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';
import { EssayTheme } from './essay-theme.entity';
import { EssayAIReview } from './essay-ai-review.entity';
import { EssayStatus } from '../enums/essay-status.enum';
import { EssayInputType } from '../enums/essay-input-type.enum';

@Entity('essays')
@Unique(['userId', 'themeId'])
export class Essay extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'theme_id' })
  themeId: string;

  @Column({ length: 200, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  text: string;

  @Column({
    name: 'input_type',
    type: 'enum',
    enum: EssayInputType,
    default: EssayInputType.TYPED,
  })
  inputType: EssayInputType;

  @Column({
    type: 'enum',
    enum: EssayStatus,
    default: EssayStatus.DRAFT,
  })
  status: EssayStatus;

  @Column({ name: 'word_count', nullable: true })
  wordCount: number;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => EssayTheme)
  @JoinColumn({ name: 'theme_id' })
  theme: EssayTheme;

  @OneToOne(() => EssayAIReview, (review) => review.essay)
  aiReview: EssayAIReview;
}
