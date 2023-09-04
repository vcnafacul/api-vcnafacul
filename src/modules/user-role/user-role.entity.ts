import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Role } from '../role/role.entity';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { User } from '../user/user.entity';

@Entity('user_roles')
export class UserRole extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'role_id' })
  roleId: number;

  @ManyToOne(() => User, (user) => user.userRole)
  @JoinColumn({ name: 'user_id' })
  public user: User;

  @ManyToOne(() => Role, (role) => role.userRoles)
  @JoinColumn({ name: 'role_id' })
  public role: Role;
}
