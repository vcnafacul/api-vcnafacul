import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { PartnerPrepCourse } from '../prepCourse/partnerPrepCourse/partner-prep-course.entity';
import { User } from '../user/user.entity';

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
  gerenciarProcessoSeletivo = 'gerenciar_processo_seletivo',
  gerenciarColaboradores = 'gerenciar_colaboradores',
  gerenciarTurmas = 'gerenciar_turmas',
  visualizarTurmas = 'visualizar_turmas',
  gerenciarEstudantes = 'gerenciar_estudantes',
  visualizarEstudantes = 'visualizar_estudantes',
  gerenciarPermissoesCursinho = 'gerenciar_permissoes_cursinho',
  visualizarMinhasInscricoes = 'visualizar_minhas_inscricoes',
}

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ default: false })
  base: boolean;

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

  @Column({
    name: Permissions.gerenciarProcessoSeletivo,
    default: false,
  })
  gerenciarProcessoSeletivo: boolean;

  @Column({
    name: Permissions.gerenciarColaboradores,
    default: false,
  })
  gerenciarColaboradores: boolean;

  @Column({
    name: Permissions.gerenciarTurmas,
    default: false,
  })
  gerenciarTurmas: boolean;

  @Column({
    name: Permissions.gerenciarEstudantes,
    default: false,
  })
  gerenciarEstudantes: boolean;

  @Column({
    name: Permissions.gerenciarPermissoesCursinho,
    default: false,
  })
  gerenciarPermissoesCursinho: boolean;

  @Column({ name: Permissions.visualizarTurmas, default: false })
  visualizarTurmas: boolean;

  @Column({ name: Permissions.visualizarEstudantes, default: false })
  visualizarEstudantes: boolean;

  @Column({ name: Permissions.visualizarMinhasInscricoes, default: false })
  visualizarMinhasInscricoes: boolean;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerPrepCourse) => partnerPrepCourse.roles,
  )
  partnerPrepCourse?: PartnerPrepCourse;

  // várias roles podem ter a mesma roleBase
  @ManyToOne(() => Role, (role) => role.children, { nullable: true })
  @JoinColumn({ name: 'roleBaseId' })
  roleBase?: Role;

  // relação inversa: uma role pode ter várias filhas
  @OneToMany(() => Role, (role) => role.roleBase)
  children: Role[];
}
