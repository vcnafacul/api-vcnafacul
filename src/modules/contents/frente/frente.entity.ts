import { LinkedListEntity } from '../../../shared/modules/linked/linked-list.entity';
import { Column, Entity, OneToMany, Unique } from 'typeorm';
import { Materias } from './enum/materias';
import { Subject } from '../subject/subject.entity';

@Entity('frente')
@Unique(['name', 'materia'])
export class Frente extends LinkedListEntity {
  get list(): string {
    throw new Error('Method not implemented.');
  }
  @Column()
  name: string;

  @Column()
  materia: Materias;

  @OneToMany(() => Subject, (subject) => subject.frente)
  subjects: Subject[];
}
