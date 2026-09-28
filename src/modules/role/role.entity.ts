import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { PartnerPrepCourse } from '../prepCourse/partnerPrepCourse/partner-prep-course.entity';
import { User } from '../user/user.entity';
import { Permissions } from './permissions/permissions';

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

  @Column({
    name: Permissions.gerenciarFormularioGlobal,
    default: false,
  })
  gerenciarFormularioGlobal: boolean;

  @Column({
    name: Permissions.gerenciarFormulario,
    default: false,
  })
  gerenciarFormulario: boolean;

  @Column({ name: Permissions.gerenciarTemas, default: false })
  gerenciarTemas: boolean;

  @Column({ name: Permissions.revisarRedacoes, default: false })
  revisarRedacoes: boolean;

  @Column({ name: Permissions.revisarTodasRedacoes, default: false })
  revisarTodasRedacoes: boolean;

  @Column({ name: Permissions.supportAgent, default: false })
  supportAgent: boolean;

  @Column({ name: Permissions.partnerPrepSupportAgent, default: false })
  partnerPrepSupportAgent: boolean;

  @Column({ name: Permissions.editarMateriasFrentes, default: false })
  editarMateriasFrentes: boolean;

  @Column({ name: Permissions.visualizarProvasCursinho, default: false })
  visualizarProvasCursinho: boolean;

  @Column({ name: Permissions.cadastrarProvasCursinho, default: false })
  cadastrarProvasCursinho: boolean;

  @Column({ name: Permissions.gerenciarCategoriasCursinho, default: false })
  gerenciarCategoriasCursinho: boolean;

  /**
   * Excluir questão órfã do banco de questões (card 33).
   *
   * ⚠️ **Permissão própria, e não `validarQuestao`.** Excluir é soft e a
   * questão só sai se passar nas cinco condições do ms, mas desfaz o vínculo
   * de cópia/versão sem volta — é ação que se concede de propósito, não um
   * efeito colateral de poder aprovar.
   */
  @Column({ name: Permissions.excluirQuestao, default: false })
  excluirQuestao: boolean;

  /**
   * Enviar notificação push pela tela admin (série `pwa-push`, BE-03/BE-06).
   *
   * ⚠️ **Permissão de plataforma.** O público pode ser "todos", então é
   * concedida de propósito, a quem fala pelo projeto. Estender a coordenadores
   * de cursinho exige escopar o público (decisão nº 2 do README da série).
   */
  @Column({ name: Permissions.enviarNotificacao, default: false })
  enviarNotificacao: boolean;

  /**
   * Ver o banco de questões, do lado do cursinho (tickets/023, card 01).
   * O `visualizarQuestao` é do projeto.
   */
  @Column({ name: Permissions.visualizarQuestoesCursinho, default: false })
  visualizarQuestoesCursinho: boolean;

  /**
   * Criar e editar questões e compor as provas **do próprio cursinho**
   * (tickets/023, card 01). Implica `visualizarQuestoesCursinho`.
   *
   * ⚠️ A permissão só abre as rotas: quem barra a prova de outro cursinho e a
   * oficial é o ms-simulado (`podeComporProva`, card 03).
   */
  @Column({ name: Permissions.editarQuestoesCursinho, default: false })
  editarQuestoesCursinho: boolean;

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
