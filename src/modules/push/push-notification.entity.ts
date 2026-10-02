import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { User } from '../user/user.entity';

export enum StatusDoEnvio {
  sending = 'sending',
  done = 'done',
  failed = 'failed',
}

/** Quem recebe um envio (BE-05). Guardado como veio, para o histórico. */
export type PublicoDoEnvio =
  | { type: 'users'; userIds: string[] }
  | { type: 'emails'; emails: string[] }
  | { type: 'roles'; roleIds: string[] }
  | { type: 'all' };

/**
 * Log de cada envio de push (BE-02). Base do histórico da tela admin (FE-06)
 * e, no futuro, da central de notificações.
 *
 * ⚠️ `success_count` = **entregue ao FCM**, não lido nem exibido.
 */
@Entity('push_notification')
export class PushNotification extends BaseEntity {
  @Column({ length: 100 })
  title: string;

  @Column({ length: 500 })
  body: string;

  /** Caminho interno (`/…`) ou URL absoluta do próprio domínio (BE-05). */
  @Column({ length: 512, nullable: true })
  url: string | null;

  @Column({ type: 'json' })
  audience: PublicoDoEnvio;

  /** `NULL` = disparo do sistema, sem pessoa por trás. */
  @Column({ name: 'sent_by_id', nullable: true })
  sentById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by_id' })
  sentBy: User | null;

  @Column({ type: 'enum', enum: StatusDoEnvio, default: StatusDoEnvio.sending })
  status: StatusDoEnvio;

  @Column({ name: 'target_users', type: 'int', default: 0 })
  targetUsers: number;

  @Column({ name: 'target_devices', type: 'int', default: 0 })
  targetDevices: number;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount: number;

  /**
   * Código de erro do FCM → quantos aparelhos falharam com ele (ex.:
   * `messaging/registration-token-not-registered`: o aparelho cancelou a
   * inscrição). `null` = sem falhas ou envio anterior a este campo.
   */
  @Column({ name: 'failure_reasons', type: 'json', nullable: true })
  failureReasons: Record<string, number> | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;
}
