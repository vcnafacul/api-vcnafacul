import { Column, Entity, OneToMany } from 'typeorm';
import { UserRole } from '../user-role/user-role.entity';
import { BaseEntity } from '../../shared/modules/base/entity.base';

export enum Permissions {
  validarCursinho = 'validar_cursinho',
  alterarPermissao = 'alterar_permissao',
  criarSimulado = 'criar_simulado',
  bancoQuestoes = 'banco_questoes',
  uploadNews = 'upload_news',
}

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ name: Permissions.validarCursinho, default: false })
  validarCursinho: boolean;

  @Column({ name: Permissions.alterarPermissao, default: false })
  alterarPermissao: boolean;

  @Column({ name: Permissions.criarSimulado, default: false })
  criarSimulado: boolean;

  @Column({ name: Permissions.bancoQuestoes, default: false })
  bancoQuestoes: boolean;

  @Column({ name: Permissions.uploadNews, default: false })
  uploadNews: boolean;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];
}
