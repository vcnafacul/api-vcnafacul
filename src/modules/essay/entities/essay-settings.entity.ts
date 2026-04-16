import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('essay_settings')
export class EssaySettings {
  @PrimaryColumn({ type: 'varchar', length: 50, default: 'default' })
  id: string;

  @Column({ name: 'ai_enabled', type: 'boolean', default: true })
  aiEnabled: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
