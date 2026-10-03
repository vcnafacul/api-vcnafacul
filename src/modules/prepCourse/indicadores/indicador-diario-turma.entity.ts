import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Metricas } from './metricas';

/**
 * Foto diária dos indicadores de UMA turma (tickets/033, README "snapshot").
 *
 * ⚠️ **Só contagens, nunca percentuais** — o cursinho é a soma das turmas, e a
 * taxa é recalculada depois da soma (sem média de médias).
 *
 * Sem chave estrangeira de propósito: apagar uma turma não pode falhar por
 * causa do histórico, e uma linha órfã não aparece em lugar nenhum (a leitura
 * parte das turmas do período).
 */
@Entity('indicador_diario_turma')
@Unique('UQ_indicador_diario_turma_dia', ['classId', 'dia'])
@Index('IDX_indicador_diario_turma_periodo_dia', [
  'partnerPrepCourseId',
  'coursePeriodId',
  'dia',
])
export class IndicadorDiarioTurma {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Dia de referência, no fuso de São Paulo (`YYYY-MM-DD`). */
  @Column({ type: 'date' })
  dia: string;

  @Column({ name: 'partner_prep_course_id', length: 36 })
  partnerPrepCourseId: string;

  @Column({ name: 'course_period_id', length: 36 })
  coursePeriodId: string;

  @Column({ name: 'class_id', length: 36 })
  classId: string;

  @Column({ type: 'json' })
  metricas: Metricas;

  /** Versão do formato de `metricas`; sobe quando uma chave muda de sentido. */
  @Column({ type: 'int', default: 1 })
  versao: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
