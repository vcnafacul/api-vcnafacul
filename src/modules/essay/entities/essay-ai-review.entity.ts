import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { Essay } from './essay.entity';

@Entity('essay_ai_reviews')
export class EssayAIReview extends BaseEntity {
  @Column({ name: 'essay_id' })
  essayId: string;

  @Column({ name: 'comp1_score' })
  comp1Score: number;

  @Column({ name: 'comp1_feedback', type: 'text' })
  comp1Feedback: string;

  @Column({ name: 'comp1_suggestion', type: 'text' })
  comp1Suggestion: string;

  @Column({ name: 'comp2_score' })
  comp2Score: number;

  @Column({ name: 'comp2_feedback', type: 'text' })
  comp2Feedback: string;

  @Column({ name: 'comp2_suggestion', type: 'text' })
  comp2Suggestion: string;

  @Column({ name: 'comp3_score' })
  comp3Score: number;

  @Column({ name: 'comp3_feedback', type: 'text' })
  comp3Feedback: string;

  @Column({ name: 'comp3_suggestion', type: 'text' })
  comp3Suggestion: string;

  @Column({ name: 'comp4_score' })
  comp4Score: number;

  @Column({ name: 'comp4_feedback', type: 'text' })
  comp4Feedback: string;

  @Column({ name: 'comp4_suggestion', type: 'text' })
  comp4Suggestion: string;

  @Column({ name: 'comp5_score' })
  comp5Score: number;

  @Column({ name: 'comp5_feedback', type: 'text' })
  comp5Feedback: string;

  @Column({ name: 'comp5_suggestion', type: 'text' })
  comp5Suggestion: string;

  @Column({ name: 'total_score' })
  totalScore: number;

  @Column({ name: 'general_comment', type: 'text' })
  generalComment: string;

  @Column({ name: 'highlighted_excerpts', type: 'json', nullable: true })
  highlightedExcerpts: Array<{
    trecho: string;
    tipo: 'positivo' | 'negativo';
    comentario: string;
  }>;

  @Column({ name: 'raw_response', type: 'json', nullable: true })
  rawResponse: unknown;

  @Column({ name: 'processing_time_ms', nullable: true })
  processingTimeMs: number;

  @Column({ length: 50 })
  provider: string;

  @Column({ length: 100 })
  model: string;

  @OneToOne(() => Essay, (essay) => essay.aiReview)
  @JoinColumn({ name: 'essay_id' })
  essay: Essay;
}
