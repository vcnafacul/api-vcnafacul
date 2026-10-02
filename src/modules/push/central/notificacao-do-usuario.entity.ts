import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';
import { PushNotification } from '../push-notification.entity';

/**
 * Uma notificação na central do app de UMA pessoa (série
 * `central-notificacoes`, card 01). Nasce no envio, para todo mundo do público
 * — com ou sem push ativado.
 *
 * ⚠️ **Título, corpo e url ficam na própria linha.** O push do resultado do
 * cartão (028) não tem `push_notification`, e a central não pode depender do
 * histórico de envios.
 */
@Entity('notificacao_do_usuario')
@Index('IDX_notificacao_do_usuario_leitura', ['userId', 'lidaEm', 'createdAt'])
export class NotificacaoDoUsuario extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100 })
  titulo: string;

  @Column({ length: 500 })
  corpo: string;

  @Column({ length: 512, nullable: true })
  url: string | null;

  /** O envio da tela admin; `null` no resultado do cartão. */
  @Column({ name: 'push_notification_id', nullable: true })
  pushNotificationId: string | null;

  @ManyToOne(() => PushNotification, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'push_notification_id' })
  pushNotification: PushNotification;

  @Column({ name: 'lida_em', type: 'timestamp', nullable: true })
  lidaEm: Date | null;
}
