import { ObjectId } from 'mongodb';
import { Conexoes } from './conexoes';

export interface TurmaCriada {
  id: string;
  ano: number;
  nome: string;
  professorId: string;
}

export interface AlunoCriado {
  studentId: string;
  userId: string;
  ano: number;
  turmaId: string;
  matriculadoEm: Date;
  saidaEm: Date | null;
  sumindoDesde: Date | null;
}

/** O que uma etapa entrega para a seguinte (ids criados). */
export interface Contexto extends Conexoes {
  hoje: Date;
  representanteUserId?: string;
  representanteColabId?: string;
  cursinhoId?: string;
  colaboradores: { id: string; userId: string; papel: string }[];
  periodos: Record<number, string>; // ano → course_period.id
  turmas: TurmaCriada[];
  processos: Record<number, string>; // ano → inscription_course.id
  formFull: Record<number, ObjectId>; // ano → FormFull._id
  alunos: AlunoCriado[];
}
