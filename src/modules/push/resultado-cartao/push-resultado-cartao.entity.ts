import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';

export enum StatusDoPushDeResultado {
  Pendente = 'pendente',
  Enviando = 'enviando',
  Enviado = 'enviado',
  Falhou = 'falhou',
  /** Push desligado neste ambiente (fora de prod). */
  Ignorado = 'ignorado',
}

/**
 * Push com o resultado do cartão, à espera do envio calmo (tickets/028).
 * Uma linha por histórico: avisos repetidos se juntam (upsert).
 */
@Entity('push_resultado_cartao')
export class PushResultadoCartao extends BaseEntity {
  @Index('UQ_push_resultado_historico', { unique: true })
  @Column({ name: 'historico_id', length: 24 })
  historicoId: string;

  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ length: 200 })
  simulado: string;

  @Column({ type: 'int' })
  total: number;

  @Column({ type: 'int' })
  acertos: number;

  @Column({ type: 'int' })
  erros: number;

  @Column({ name: 'em_branco', type: 'int' })
  emBranco: number;

  /** % inteiro: acertos ÷ total. */
  @Column({ type: 'int' })
  aproveitamento: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: StatusDoPushDeResultado.Pendente,
  })
  status: StatusDoPushDeResultado;

  /** Quantas vezes já saiu — `> 0` vira "Resultado atualizado". */
  @Column({ type: 'int', default: 0 })
  envios: number;

  /** Falhas seguidas no envio atual. */
  @Column({ type: 'int', default: 0 })
  tentativas: number;

  @Column({ name: 'proxima_tentativa_em', type: 'datetime' })
  proximaTentativaEm: Date;
}
