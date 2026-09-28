import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { Status } from '../simulado/enum/status.enum';
import { TypeGeo } from './enum/typeGeo';
import { LogGeo } from './log-geo/log-geo.entity';

@Entity('geolocations')
export class Geolocation extends BaseEntity {
  @Column({ type: 'double' })
  public latitude: number;

  @Column({ type: 'double' })
  public longitude: number;

  @Column()
  public name: string;

  @Column()
  public cep: string;

  @Column()
  public state: string;

  @Column()
  public city: string;

  @Column()
  public neighborhood: string;

  @Column()
  public street: string;

  @Column({ nullable: true })
  public number?: string;

  @Column({ nullable: true })
  public complement?: string;

  @Column({ nullable: true })
  public phone?: string;

  @Column({ nullable: true })
  public whatsapp?: string;

  @Column({ nullable: true })
  public email?: string;

  @Column({ nullable: true })
  public email2?: string;

  @Column({ nullable: true })
  public category?: string;

  @Column({ nullable: true })
  public site?: string;

  @Column({ nullable: true })
  public linkedin?: string;

  @Column({ nullable: true })
  public youtube?: string;

  @Column({ nullable: true })
  public facebook?: string;

  @Column({ nullable: true })
  public instagram?: string;

  @Column({ nullable: true })
  public twitter?: string;

  @Column({ nullable: true })
  public tiktok?: string;

  @Column({ name: 'user_fullname' })
  public userFullName: string;

  @Column({ name: 'user_phone' })
  public userPhone: string;

  @Column({ name: 'user_connection' })
  public userConnection: string;

  @Column({ name: 'user_email' })
  public userEmail: string;

  @Column({ default: Status.Pending })
  public status: Status;

  @Column({ default: false })
  public reportAddress: boolean;

  @Column({ default: false })
  public reportContact: boolean;

  @Column({ default: false })
  public reportOther: boolean;

  @Column({ nullable: true })
  public campus?: string;

  @Column({ nullable: true })
  public alias?: string;

  @Column({ default: TypeGeo.PREP_COURSE })
  public type: TypeGeo;

  /**
   * Última mudança de CONTEÚDO (endereço, contato…) pelo `updateGeo` — não
   * muda em report nem em troca de status (tickets/022, card 03).
   *
   * ⚠️ Existe porque o `updated_at` de `geolocations` nunca muda depois da
   * criação (coluna comum, sem `ON UPDATE`). Serve à validade das confirmações
   * e à "Última atualização" da busca. `datetime(3)`: ver `GeoConfirmation`.
   */
  @Column({
    name: 'info_updated_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  public infoUpdatedAt?: Date | null;

  @OneToMany(() => LogGeo, (logGeo) => logGeo.geo)
  public logs: LogGeo[];
}
