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

  /**
   * Os simulados da prova, copiados do ms ao salvar o evento (tickets/039): o
   * aluno escolhe o SIMULADO — a prova Enem Dia 1 tem dois (Inglês e Espanhol).
   * Nulo em evento salvo antes disso: quem lê completa pelo ms.
   *
   * `simple-json` (texto), e não `json`: no MariaDB de homol/prod `json` é outro
   * tipo, e o texto se comporta igual nos dois bancos.
   */
  @Column({ type: 'simple-json', nullable: true })
  simulados: SimuladoDaProvaDoEvento[] | null;
}

export type SimuladoDaProvaDoEvento = { simuladoId: string; nome: string };
