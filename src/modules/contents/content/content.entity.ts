import { Column, Entity, ManyToOne, OneToMany, Unique } from 'typeorm';
import { NodeEntity } from '../../../shared/modules/node/node.entity';
import { User } from '../../user/user.entity';
import { FileContent } from '../file-content/file-content.entity';
import { Subject } from '../subject/subject.entity';
import { StatusContent } from './enum/status-content';

@Entity('content')
@Unique(['title', 'subject'])
export class Content extends NodeEntity {
  @Column({ default: StatusContent.Pending_Upload })
  status: StatusContent;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => User, (user) => user.content)
  user: User;

  @ManyToOne(() => Subject, (subject) => subject.content)
  subject: Subject;

  @OneToMany(() => FileContent, (file) => file.content, { cascade: true })
  files: FileContent[];

  @ManyToOne(() => FileContent, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  file: FileContent;

  get list(): string {
    return this.subject.id;
  }
}
