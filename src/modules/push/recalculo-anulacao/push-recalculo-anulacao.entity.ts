import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { StatusDoPushDeResultado } from '../resultado-cartao/push-resultado-cartao.entity';

/**
 * Push "nota atualizada", à espera do envio calmo (tickets/042, card 17).
 *
 * ⚠️ **Tabela própria, e não a `push_resultado_cartao`:** aquela é única por
 * `historico_id`, e o histórico recalculado tem o MESMO id do que já recebeu o
 * push do resultado — o upsert sobrescreveria aquela linha e este push nunca
 * sairia como o que é.
 *
 * Único em `(job_id, user_id)`: o retry do callback não duplica. O índice
 * `(recorte, user_id, created_at)` serve o limite de 1 por prova por aluno por
 * dia e a busca da linha pendente que um recálculo novo atualiza (card 20).
 */
@Entity('push_recalculo_anulacao')
@Index('UQ_push_recalculo_job_usuario', ['jobId', 'userId'], { unique: true })
@Index('IDX_push_recalculo_recorte_usuario', ['recorte', 'userId', 'createdAt'])
export class PushRecalculoAnulacao extends BaseEntity {
  @Column({ name: 'job_id', length: 24 })
  jobId: string;

  @Column({ name: 'user_id', length: 36 })
  userId: string;

  /** O histórico regravado — o deep link do push abre ele. */
  @Column({ name: 'historico_id', length: 24 })
  historicoId: string;

  /** Os simulados do relatório (ordenados): a "prova" do limite diário. */
  @Column({ length: 200 })
  recorte: string;

  @Column({ name: 'prova_nome', length: 200 })
  provaNome: string;

  /** Quantas questões anuladas: muda o texto ("Uma questão" / "Questões"). */
  @Column({ name: 'quantas_anuladas', type: 'int', default: 1 })
  quantasAnuladas: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: StatusDoPushDeResultado.Pendente,
  })
  status: StatusDoPushDeResultado;

  /**
   * A nota de ANTES da primeira vez que esta linha entrou pendente, e a de
   * depois do último recálculo (card 20). Igual → o push não sai: a nota voltou
   * ao que era (anular → recalcular → desanular → recalcular).
   * `acertos_antes` nulo = histórico antigo sem a contagem: o push sai.
   */
  @Column({ name: 'acertos_antes', type: 'int', nullable: true })
  acertosAntes: number | null;

  @Column({ name: 'total_antes', type: 'int', nullable: true })
  totalAntes: number | null;

  @Column({ name: 'acertos_depois', type: 'int', nullable: true })
  acertosDepois: number | null;

  @Column({ name: 'total_depois', type: 'int', nullable: true })
  totalDepois: number | null;

  @Column({ type: 'int', default: 0 })
  envios: number;

  @Column({ type: 'int', default: 0 })
  tentativas: number;

  /** ⚠️ `datetime(3)` — mesma razão do `push_resultado_cartao`. */
  @Column({ name: 'proxima_tentativa_em', type: 'datetime', precision: 3 })
  proximaTentativaEm: Date;
}
