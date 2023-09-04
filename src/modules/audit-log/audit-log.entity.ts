import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { User } from '../user/user.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column('json')
  changes: string;

  @Column({ name: 'updated_by' })
  updatedBy: number;

  @ManyToOne(() => User, (user) => user)
  @JoinColumn({ name: 'updated_by' })
  public user: User;
}
