import { Column, Entity, OneToMany } from 'typeorm';
import { UserRole } from '../user-role/user-role.entity';
import { BaseEntity } from '../../shared/modules/base/entity.base';

export enum Permissions {
  validarCursinho = 'validar_cursinho',
  alterarPermissao = 'alterar_permissao',
  criarSimulado = 'criar_simulado',
  criarQuestao = 'criar_questao',
  visualizarQuestao = 'visualizar_questao',
  validarQuestao = 'validar_questao',
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

  @Column({ name: Permissions.criarQuestao, default: false })
  criarQuestao: boolean;

  @Column({ name: Permissions.visualizarQuestao, default: false })
  visualizarQuestao: boolean;

  @Column({ name: Permissions.validarQuestao, default: false })
  validarQuestao: boolean;

  @Column({ name: Permissions.uploadNews, default: false })
  uploadNews: boolean;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];
}
