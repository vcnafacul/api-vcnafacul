import { LinkedListEntity } from '../../../shared/modules/linked/linked-list.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Materias } from './enum/materias';
import { Subject } from '../subject/subject.entity';

@Entity('frente')
export class Frente extends LinkedListEntity {
  get list(): number {
    throw new Error('Method not implemented.');
  }
  @Column({ unique: true })
  name: string;

  @Column()
  materia: Materias;

  @OneToMany(() => Subject, (subject) => subject.frente)
  subject: Subject;
}
