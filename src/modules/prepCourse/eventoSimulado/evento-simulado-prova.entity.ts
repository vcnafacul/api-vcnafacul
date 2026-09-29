import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { EventoSimulado } from './evento-simulado.entity';

/** Uma prova que o aluno pode escolher no evento (id do Mongo, no ms). */
@Entity('simulado_evento_prova')
export class EventoSimuladoProva extends BaseEntity {
  @Column({ name: 'evento_id' })
  eventoId: string;

  @ManyToOne(() => EventoSimulado, (e) => e.provas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: EventoSimulado;

  @Column({ name: 'prova_id', length: 24 })
  provaId: string;

  /** Cópia do nome, para listar sem ir ao ms. */
  @Column({ name: 'nome_da_prova', length: 200 })
  nomeDaProva: string;

  @Column({ type: 'int', default: 0 })
  ordem: number;
}
