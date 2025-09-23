import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../../../shared/modules/base/entity.base';

@Entity('snapshot_content_status')
@Unique(['snapshot_date'])
export class SnapshotContentStatus extends BaseEntity {
  @Column({ type: 'date' })
  snapshot_date: Date;

  @Column({ type: 'int', default: 0 })
  pendentes: number;

  @Column({ type: 'int', default: 0 })
  aprovados: number;

  @Column({ type: 'int', default: 0 })
  reprovados: number;

  @Column({ type: 'int', default: 0 })
  pendentes_upload: number;

  @Column({ type: 'int', default: 0 })
  total: number;
}
