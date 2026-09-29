import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { EventoSimuladoInscricao } from './evento-simulado-inscricao.entity';
import { EventoSimuladoProva } from './evento-simulado-prova.entity';

/**
 * Evento de simulado presencial do cursinho (tickets/026). Só controle do
 * cursinho: quem pretende fazer e qual prova — sem vaga, sem obrigação.
 *
 * ⚠️ A janela (`inscricoesDe`/`inscricoesAte`) é do EVENTO, separada da janela
 * do simulado digital (`disponivelDe`/`disponivelAte`, Etapa 5).
 */
@Entity('simulado_evento')
export class EventoSimulado extends BaseEntity {
  @Column({ name: 'partner_prep_course_id' })
  partnerPrepCourseId: string;

  @ManyToOne(() => PartnerPrepCourse)
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  @Column({ length: 120 })
  nome: string;

  /** Texto livre: data e local do presencial, se o cursinho quiser. */
  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  @Column({ name: 'inscricoes_de', type: 'datetime' })
  inscricoesDe: Date;

  @Column({ name: 'inscricoes_ate', type: 'datetime' })
  inscricoesAte: Date;

  /** Push de abertura já saiu — "uma vez só" (card 04). */
  @Column({
    name: 'aviso_abertura_enviado_em',
    type: 'datetime',
    nullable: true,
  })
  avisoAberturaEnviadoEm: Date | null;

  @OneToMany(() => EventoSimuladoProva, (p) => p.evento)
  provas: EventoSimuladoProva[];

  @OneToMany(() => EventoSimuladoInscricao, (i) => i.evento)
  inscricoes: EventoSimuladoInscricao[];
}
