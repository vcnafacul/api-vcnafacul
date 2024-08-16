import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { User } from '../user/user.entity';
import { Geolocation } from '../geo/geo.entity';

@Entity('cursinho_parceiro')
export class CursinhoParceiro extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'geo_id' })
  geoId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  public user: User;

  @OneToOne(() => Geolocation)
  @JoinColumn({ name: 'geo_id' })
  public geo: Geolocation;
}
