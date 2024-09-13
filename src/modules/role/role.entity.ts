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
  visualizarProvas = 'visualizar_provas',
  cadastrarProvas = 'cadastrar_provas',
  visualizarDemanda = 'visualizar_demanda',
  uploadDemanda = 'upload_demanda',
  validarDemanda = 'validar_demanda',
  gerenciadorDemanda = 'gerenciador_demanda',
  abrirInscricoesCursinhoParceiro = 'abrir_inscricoes_cursinho_parceiro',
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

  @Column({ name: Permissions.visualizarProvas, default: false })
  visualizarProvas: boolean;

  @Column({ name: Permissions.cadastrarProvas, default: false })
  cadastrarProvas: boolean;

  @Column({ name: Permissions.visualizarDemanda, default: false })
  visualizarDemanda: boolean;

  @Column({ name: Permissions.uploadDemanda, default: false })
  uploadDemanda: boolean;

  @Column({ name: Permissions.validarDemanda, default: false })
  validarDemanda: boolean;

  @Column({ name: Permissions.gerenciadorDemanda, default: false })
  gerenciadorDemanda: boolean;

  @Column({ name: Permissions.abrirInscricoesCursinhoParceiro, default: false })
  abrirInscricoesCursinhoParceiro: boolean;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];
}
