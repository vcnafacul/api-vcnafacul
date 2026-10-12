import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';
import { EventoSimulado } from './evento-simulado.entity';

/**
 * A inscrição de um aluno num evento, com a prova (e o simulado) escolhida. Uma por aluno e
 * evento (trocar de prova atualiza esta mesma linha; desistir apaga).
 */
@Entity('simulado_evento_inscricao')
@Index('UQ_inscricao_evento_aluno', ['eventoId', 'userId'], { unique: true })
export class EventoSimuladoInscricao extends BaseEntity {
  @Column({ name: 'evento_id' })
  eventoId: string;

  @ManyToOne(() => EventoSimulado, (e) => e.inscricoes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: EventoSimulado;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'prova_id', length: 24 })
  provaId: string;

  /**
   * O simulado escolhido (tickets/039). Nulo nas inscrições de antes: numa prova
   * de um simulado só, vale o único.
   */
  @Column({ name: 'simulado_id', type: 'varchar', length: 24, nullable: true })
  simuladoId: string | null;
}
