import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';

/**
 * O fim de um recálculo por anulação, já recebido do ms (tickets/042, card 14).
 *
 * ⚠️ **Existe para a idempotência do callback.** O ms reenvia o aviso (3
 * tentativas, e de novo no boot se não confirmou): sem esta linha, cada reenvio
 * enfileiraria os indicadores de novo e — no card 17 — mandaria o push outra vez.
 */
@Entity('recalculo_anulacao_job')
export class RecalculoAnulacaoJob extends BaseEntity {
  @Index('UQ_recalculo_anulacao_job', { unique: true })
  @Column({ name: 'job_id', length: 24 })
  jobId: string;

  @Column({ name: 'prova_nome', length: 200 })
  provaNome: string;

  /** Quantos históricos o ms regravou. */
  @Column({ type: 'int', default: 0 })
  afetados: number;
}
