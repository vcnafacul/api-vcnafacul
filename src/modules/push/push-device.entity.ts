import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { User } from '../user/user.entity';

export enum PlataformaDoAparelho {
  android = 'android',
  ios = 'ios',
  desktop = 'desktop',
  other = 'other',
}

/**
 * Um navegador/aparelho que aceitou receber push (série `pwa-push`, BE-02).
 *
 * ⚠️ **Um token pertence a UM usuário.** Se outra pessoa loga no mesmo
 * navegador, a linha é reatribuída (BE-04) — nunca duplicada.
 *
 * ⚠️ `deleted_at` preenchido = desativado. A linha apagada **continua
 * ocupando o `token_hash`**: registrar o mesmo token de novo tem de restaurar
 * esta linha, não criar outra.
 */
@Entity('push_device')
export class PushDevice extends BaseEntity {
  @Index('IDX_push_device_user')
  @Column({ name: 'user_id' })
  userId: string;

  /** Apagar o usuário de verdade leva os aparelhos junto. */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Token do FCM. Sem tamanho garantido — por isso `text` e o hash abaixo. */
  @Column({ type: 'text' })
  token: string;

  /**
   * ⚠️ **SHA-256 do token, e é ELE o único.** Índice único em `varchar` longo
   * esbarra no limite de chave do InnoDB/MariaDB com utf8mb4.
   */
  @Column({ name: 'token_hash', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'user_agent', length: 512, nullable: true })
  userAgent: string | null;

  @Column({
    type: 'enum',
    enum: PlataformaDoAparelho,
    default: PlataformaDoAparelho.other,
  })
  platform: PlataformaDoAparelho;

  /** O PWA estava instalado quando o aparelho registrou. */
  @Column({ default: false })
  standalone: boolean;

  /** Atualizado a cada registro/abertura (FE-03); a limpeza do BE-07 usa. */
  @Column({
    name: 'last_seen_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastSeenAt: Date;
}
