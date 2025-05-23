import { Column, Entity, ManyToOne, OneToMany, Unique } from 'typeorm';
import { LinkedListEntity } from '../../../shared/modules/linked/linked-list.entity';
import { Content } from '../content/content.entity';
import { Frente } from '../frente/frente.entity';

@Entity('subject')
@Unique(['name', 'frente'])
export class Subject extends LinkedListEntity {
  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @OneToMany(() => Content, (content) => content.subject)
  contents: Content[];

  @ManyToOne(() => Frente, (frente) => frente.subjects)
  frente: Frente;

  get list(): string | undefined {
    return this.frente?.id;
  }
}
