import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { NodeEntity } from '../../../shared/modules/node/node.entity';
import { User } from '../../user/user.entity';
import { Subject } from '../subject/subject.entity';
import { StatusContent } from './enum/status-content';

@Entity('content')
@Unique(['title', 'subject'])
export class Content extends NodeEntity {
  @Column({ nullable: true })
  filename?: string;

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

  get list(): number {
    return this.subject.id;
  }
}
