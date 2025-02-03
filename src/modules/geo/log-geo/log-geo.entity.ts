import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';
import { StatusLogGeo } from '../enum/status-log-geo';
import { Geolocation } from '../geo.entity';

@Entity('log_geo')
export class LogGeo extends BaseEntity {
  @Column({ name: 'geo_id' })
  geoId: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column()
  public status: StatusLogGeo;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Geolocation, (geo) => geo.logs, {
    eager: false,
  })
  @JoinColumn({ name: 'geo_id' }) // Ensures the join column is correctly mapped
  geo: Geolocation;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  public user?: User;
}
