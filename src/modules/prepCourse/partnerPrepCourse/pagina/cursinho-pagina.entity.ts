import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { PartnerPrepCourse } from '../partner-prep-course.entity';
import { CursinhoLink } from './cursinho-link.entity';

/**
 * A página pública do cursinho (tickets/025). Nasce na primeira abertura da
 * edição, desativada: sem linha, ou com `active = false`, a rota pública dá 404.
 */
@Entity('cursinho_pagina')
export class CursinhoPagina extends BaseEntity {
  // Único pelo `OneToOne` (índice REL_…): uma página por cursinho.
  @Column({ name: 'partner_prep_course_id' })
  partnerPrepCourseId: string;

  @OneToOne(() => PartnerPrepCourse)
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  @Column({ length: 60, unique: true })
  slug: string;

  /** Markdown, sem imagens. Obrigatório para ativar (regra do service). */
  @Column({ name: 'quem_somos', type: 'text', nullable: true })
  quemSomos: string | null;

  @Column({ default: false })
  active: boolean;

  @OneToMany(() => CursinhoLink, (l) => l.pagina)
  links: CursinhoLink[];
}
