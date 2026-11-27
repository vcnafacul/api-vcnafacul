import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * E-mails que, fora de produção, saem pelo SMTP "liberado" em vez do Mailpit.
 * Em produção a tabela existe, mas fica vazia e não é consultada.
 */
@Entity('email_whitelist')
export class EmailWhitelist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  /** Fim da liberação: 30 dias depois do cadastro (ver validadeDaLiberacao). */
  @Column({ name: 'expired_at', type: 'timestamp' })
  expiredAt: Date;

  /**
   * É isto que o envio olha. O cron `email-whitelist-vencidos` desliga quem
   * passou do `expired_at`, de hora em hora.
   */
  @Column({ name: 'is_actived', type: 'boolean', default: true })
  isActived: boolean;
}
