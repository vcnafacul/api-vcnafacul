import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('home_about')
export class HomeAbout {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'video_url', type: 'varchar', length: 255, nullable: true })
  videoUrl: string | null;

  @Column({
    name: 'thumbnail_url',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  thumbnailUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
