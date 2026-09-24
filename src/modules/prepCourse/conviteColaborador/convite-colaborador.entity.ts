import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { Role } from '../../role/role.entity';
import { User } from '../../user/user.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';

export enum StatusDoConvite {
  pendente = 'pendente',
  aceito = 'aceito',
  cancelado = 'cancelado',
  /** Só quando um convite novo substitui um pendente vencido — ver `chaveAtiva`. */
  expirado = 'expirado',
}

/**
 * Um convite para ser colaborador de um cursinho, já com a função (card 03 de
 * `convite-de-colaborador`).
 *
 * ⚠️ **Antes o convite não existia no banco** — era só um JWT de 7 dias no
 * link: sem lista de pendentes, sem cancelar, sem onde guardar a função.
 */
@Entity('convites_colaborador')
@Index('IDX_convite_colaborador_chave_ativa', ['chaveAtiva'], { unique: true })
export class ConviteColaborador extends BaseEntity {
  /** ⚠️ Normalizado (`trim` + minúsculas) — é a chave da regra de duplicado. */
  @Column({ length: 255 })
  email: string;

  @Column({ name: 'partner_prep_course_id' })
  partnerPrepCourseId: string;

  @ManyToOne(() => PartnerPrepCourse)
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  /** ⚠️ Sempre uma função DESTE cursinho — conferido no service. */
  @Column({ name: 'role_id' })
  roleId: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'convidado_por' })
  convidadoPorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'convidado_por' })
  convidadoPor: User;

  /**
   * ⚠️ **O hash, nunca o token.** O token (aleatório, opaco — não é JWT) só
   * existe no email; vazar a tabela não entrega link nenhum.
   */
  @Column({ name: 'token_hash', length: 64, unique: true })
  tokenHash: string;

  @Column({
    type: 'enum',
    enum: StatusDoConvite,
    default: StatusDoConvite.pendente,
  })
  status: StatusDoConvite;

  /**
   * ⚠️ **Válido = `pendente` E `expiraEm > agora`** — calculado, sem job. Passada
   * a data, o convite deixa de valer sozinho; o status só muda por ação.
   */
  @Column({ name: 'expira_em', type: 'timestamp' })
  expiraEm: Date;

  @Column({ name: 'aceito_por', nullable: true })
  aceitoPorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'aceito_por' })
  aceitoPor: User | null;

  /**
   * ⚠️ **Um convite pendente por email × cursinho, garantido NO BANCO.** Duplo
   * clique em "Convidar" = duas requisições que passam juntas por qualquer
   * checagem feita no código; o índice único desta coluna recusa a segunda.
   *
   * `NULL` fora de `pendente` — o índice único aceita vários `NULL`, então
   * aceitos, cancelados e expirados não conflitam.
   *
   * ⚠️ O pendente VENCIDO continua ocupando a chave: ao criar um convite novo,
   * ele vira `expirado` na mesma transação.
   *
   * ⚠️ **Homol e prod são MariaDB.** Uma migration gerada a partir daqui sai
   * com `STORED NULL`, que o MariaDB recusa — tirar o `NULL` à mão (ver a
   * migration `1790270693123`).
   */
  @Column({
    name: 'chave_ativa',
    type: 'varchar',
    length: 300,
    nullable: true,
    generatedType: 'STORED',
    asExpression:
      "IF(`status` = 'pendente', CONCAT(`email`, ':', `partner_prep_course_id`), NULL)",
    select: false,
    insert: false,
    update: false,
  })
  chaveAtiva?: string | null;
}
