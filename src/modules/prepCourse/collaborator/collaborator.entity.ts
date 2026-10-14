import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { Role } from '../../role/role.entity';
import { User } from '../../user/user.entity';
import { AttendanceRecord } from '../attendance/attendanceRecord/attendance-record.entity';
import { Class } from '../class/class.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';

/**
 * Colaborador de um cursinho. Excluir é soft delete (`deleted_at`): a linha
 * fica como **ex-membro** (tickets/040) e a pessoa pode voltar por convite,
 * numa linha nova.
 *
 * ⚠️ No máximo **um colaborador não excluído por usuário**, garantido pelo
 * índice único em `active_user_id` — que também é a trava de corrida do aceite
 * de convite (`ER_DUP_ENTRY`). O `UNIQUE (user_id)` de antes contava as linhas
 * excluídas e não deixava a pessoa voltar.
 */
@Entity('collaborators')
@Index('UQ_collaborator_nao_excluido_por_usuario', ['activeUserId'], {
  unique: true,
})
export class Collaborator extends BaseEntity {
  @ManyToOne(() => User, (user) => user.collaborators, {
    eager: true,
  })
  @JoinColumn({ name: 'user_id' })
  public user: User;

  /**
   * `user_id` enquanto não excluído; `NULL` depois (o índice único aceita
   * vários `NULL`). Só existe para o índice.
   *
   * ⚠️ Homol/prod são MariaDB: a migration não pode ter `NULL` depois do
   * `STORED` (ver CLAUDE.md).
   */
  @Column({
    name: 'active_user_id',
    type: 'varchar',
    length: 36,
    nullable: true,
    generatedType: 'STORED',
    asExpression: 'IF(`deleted_at` IS NULL, `user_id`, NULL)',
    select: false,
    insert: false,
    update: false,
  })
  activeUserId?: string | null;

  /** Quem excluiu (tickets/040). */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'excluded_by_id' })
  public excludedBy?: User | null;

  /** O perfil que a pessoa recebeu ao ser excluída (tickets/040). */
  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_given_id' })
  public roleGiven?: Role | null;

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerPrepCourse) => partnerPrepCourse.members,
  )
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  @Column({ nullable: true })
  public photo: string;

  @Column({ nullable: true })
  public description: string;

  @Column({ default: true })
  public actived: boolean;

  /**
   * A função de antes da inativação, devolvida ao reativar
   * (tickets-documentacao, card 02). `null` com o colaborador ativo.
   */
  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_before_inactive_id' })
  public roleBeforeInactive: Role | null;

  @ManyToMany(() => Class, (classes) => classes.admins)
  public Class: Class[];

  @OneToMany(
    () => AttendanceRecord,
    (attendanceRecord) => attendanceRecord.class,
  )
  public attendanceRecords: AttendanceRecord[];
}
