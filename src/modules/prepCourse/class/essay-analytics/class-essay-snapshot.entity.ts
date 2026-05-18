import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { Class } from '../class.entity';

export interface ClassEssayPayload {
  geral: number; // 0..1000
  competencias: {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
    c5: number;
  };
  studentsWithAtLeastOneHumanReview: number;
  essaysReviewedByHuman: number;
  essaysSubmittedTotal: number;
  humanReviewRate: number; // 0..1
}

@Entity('class_essay_snapshots')
@Unique(['classId', 'month'])
export class ClassEssaySnapshot extends BaseEntity {
  @Column({ name: 'class_id', length: 36 })
  classId: string;

  @Column({ length: 7 })
  month: string;

  @Column({ name: 'month_start', type: 'timestamp' })
  monthStart: Date;

  @Column({ name: 'month_end', type: 'timestamp' })
  monthEnd: Date;

  @Column({ name: 'user_ids', type: 'json' })
  userIds: string[];

  @Column({ type: 'json' })
  payload: ClassEssayPayload;

  @Column({ name: 'generated_at', type: 'timestamp' })
  generatedAt: Date;

  @Column({ name: 'source_essay_count' })
  sourceEssayCount: number;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;
}
