import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';
import { Content } from '../content/content.entity';

@Entity('file_content')
export class FileContent extends BaseEntity {
  @Column()
  fileKey: string;

  @Column({ nullable: true })
  originalName?: string;

  @ManyToOne(() => Content, (content) => content.files, { onDelete: 'CASCADE' })
  content: Content;

  @ManyToOne(() => User, { eager: true })
  uploadedBy: User;
}
