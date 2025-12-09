import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { PartnerPrepCourse } from '../../partnerPrepCourse/partner-prep-course.entity';

@Entity('log_partner')
export class LogPartner extends BaseEntity {
  @Column({ name: 'partner_id' })
  partnerId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerPrepCourse) => partnerPrepCourse.logs,
    {
      eager: false,
    },
  )
  @JoinColumn({ name: 'partner_id' })
  partner: PartnerPrepCourse;
}
