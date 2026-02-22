import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';

@Entity('collaborator_frentes')
@Index(['collaboratorId', 'frenteId'], { unique: true })
export class CollaboratorFrente extends BaseEntity {
  @Column({ name: 'collaborator_id' })
  public collaboratorId: string;

  @Column({ name: 'frente_id' })
  public frenteId: string;
}
