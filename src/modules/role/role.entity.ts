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
