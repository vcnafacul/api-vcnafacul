import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Geolocation } from '../geo.entity';

/**
 * "A informação deste cursinho está correta" (tickets/022, card 03). Uma por
 * usuário por cursinho.
 *
 * ⚠️ **Não estende `BaseEntity`**: as datas dele são em SEGUNDOS, e a validade
 * compara `confirmado_em > geolocations.info_updated_at` — confirmar no mesmo
 * segundo de uma edição daria "inválida". Aqui é `datetime(3)`.
 *
 * Desfazer apaga a linha (não há histórico a guardar).
 */
@Entity('geo_confirmations')
@Index('UQ_geo_confirmation_geo_user', ['geoId', 'userId'], { unique: true })
export class GeoConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'geo_id' })
  geoId: string;

  @ManyToOne(() => Geolocation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'geo_id' })
  geo: Geolocation;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'confirmado_em', type: 'datetime', precision: 3 })
  confirmadoEm: Date;
}
