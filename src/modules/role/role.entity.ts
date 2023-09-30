import { Column, Entity, OneToMany } from 'typeorm';
import { UserRole } from '../user-role/user-role.entity';
import { BaseEntity } from '../../shared/modules/base/entity.base';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ name: 'validar_cursinho', default: false })
  validarCursinho: boolean;

  @Column({ name: 'alterar_permissao', default: false })
  alterarPermissao: boolean;

  @Column({ name: 'criar_simulado', default: false })
  criarSimulado: boolean;

  @Column({ name: 'banco_questoes', default: false })
  bancoQuestoes: boolean;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];
}
