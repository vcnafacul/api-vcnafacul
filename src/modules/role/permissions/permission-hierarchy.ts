import { Permissions } from './permissions';

export interface PermissionNode {
  key: Permissions;
  label: string;
  type: PermissionType;
  implies?: Permissions[];
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionNode[];
}

export enum PermissionType {
  project = 'project',
  prepCourse = 'prepCourse',
}

export const PERMISSION_HIERARCHY: PermissionGroup[] = [
  {
    key: 'questoes',
    label: 'Questões',
    permissions: [
      {
        key: Permissions.criarQuestao,
        label: 'Criar questão',
        type: PermissionType.project,
        implies: [Permissions.visualizarQuestao],
      },
      {
        key: Permissions.validarQuestao,
        label: 'Validar questão',
        type: PermissionType.project,
        implies: [Permissions.visualizarQuestao],
      },
      {
        key: Permissions.visualizarQuestao,
        label: 'Visualizar questão',
        type: PermissionType.project,
      },
    ],
  },
  {
    key: 'provas',
    label: 'Provas',
    permissions: [
      {
        key: Permissions.cadastrarProvas,
        label: 'Cadastrar provas',
        type: PermissionType.project,
        implies: [Permissions.visualizarProvas],
      },
      {
        key: Permissions.visualizarProvas,
        label: 'Visualizar provas',
        type: PermissionType.project,
      },
    ],
  },
  {
    key: 'demanda',
    label: 'Demanda',
    permissions: [
      {
        key: Permissions.gerenciadorDemanda,
        label: 'Gerenciar demanda',
        type: PermissionType.project,
        implies: [
          Permissions.uploadDemanda,
          Permissions.validarDemanda,
          Permissions.visualizarDemanda,
          Permissions.editarMateriasFrentes,
        ],
      },
      {
        key: Permissions.uploadDemanda,
        label: 'Upload de demanda',
        type: PermissionType.project,
        implies: [Permissions.visualizarDemanda],
      },
      {
        key: Permissions.validarDemanda,
        label: 'Validar demanda',
        type: PermissionType.project,
        implies: [Permissions.visualizarDemanda],
      },
      {
        key: Permissions.visualizarDemanda,
        label: 'Visualizar demanda',
        type: PermissionType.project,
      },
      {
        key: Permissions.editarMateriasFrentes,
        label: 'Editar matérias e frentes',
        type: PermissionType.project,
      },
    ],
  },
  {
    key: 'turmas',
    label: 'Turmas',
    permissions: [
      {
        key: Permissions.gerenciarTurmas,
        label: 'Gerenciar turmas',
        type: PermissionType.prepCourse,
        implies: [Permissions.visualizarTurmas],
      },
      {
        key: Permissions.visualizarTurmas,
        label: 'Visualizar turmas',
        type: PermissionType.prepCourse,
      },
    ],
  },
  {
    key: 'estudantes',
    label: 'Estudantes',
    permissions: [
      {
        key: Permissions.gerenciarEstudantes,
        label: 'Gerenciar estudantes',
        type: PermissionType.prepCourse,
        implies: [Permissions.visualizarEstudantes],
      },
      {
        key: Permissions.visualizarEstudantes,
        label: 'Visualizar estudantes',
        type: PermissionType.prepCourse,
      },
    ],
  },
  {
    key: 'permissoes',
    label: 'Permissões',
    permissions: [
      {
        key: Permissions.alterarPermissao,
        label: 'Alterar permissão',
        type: PermissionType.project,
        implies: [Permissions.gerenciarPermissoesCursinho],
      },
      {
        key: Permissions.gerenciarPermissoesCursinho,
        label: 'Gerenciar permissões do cursinho',
        type: PermissionType.prepCourse,
      },
    ],
  },
  {
    key: 'simulado',
    label: 'Simulado',
    permissions: [
      {
        key: Permissions.criarSimulado,
        label: 'Visualizar simulado',
        type: PermissionType.project,
      },
    ],
  },
  {
    key: 'noticias',
    label: 'Notícias',
    permissions: [
      {
        key: Permissions.uploadNews,
        label: 'Upload de notícias',
        type: PermissionType.project,
      },
    ],
  },
  {
    key: 'redacoes',
    label: 'Redações',
    permissions: [
      {
        key: Permissions.gerenciarTemas,
        label: 'Gerenciar temas',
        type: PermissionType.project,
      },
      {
        key: Permissions.revisarTodasRedacoes,
        label: 'Revisar todas as redações',
        type: PermissionType.project,
      },
      {
        key: Permissions.revisarRedacoes,
        label: 'Revisar redações',
        type: PermissionType.prepCourse,
      },
    ],
  },
  {
    key: 'formularios',
    label: 'Formulários',
    permissions: [
      {
        key: Permissions.gerenciarFormularioGlobal,
        label: 'Gerenciar formulário global',
        type: PermissionType.project,
      },
      {
        key: Permissions.gerenciarFormulario,
        label: 'Gerenciar formulário',
        type: PermissionType.prepCourse,
      },
    ],
  },
  {
    key: 'processo_seletivo',
    label: 'Processo Seletivo',
    permissions: [
      {
        key: Permissions.gerenciarProcessoSeletivo,
        label: 'Gerenciar processo seletivo',
        type: PermissionType.prepCourse,
      },
      {
        key: Permissions.validarCursinho,
        label: 'Validar cursinho',
        type: PermissionType.project,
      },
      {
        key: Permissions.visualizarMinhasInscricoes,
        label: 'Visualizar minhas inscrições',
        type: PermissionType.prepCourse,
      },
    ],
  },
  {
    key: 'colaboradores',
    label: 'Colaboradores',
    permissions: [
      {
        key: Permissions.gerenciarColaboradores,
        label: 'Gerenciar colaboradores',
        type: PermissionType.prepCourse,
      },
    ],
  },
  {
    key: 'suporte',
    label: 'Suporte',
    permissions: [
      {
        key: Permissions.supportAgent,
        label: 'Agente de suporte',
        type: PermissionType.project,
      },
      {
        key: Permissions.partnerPrepSupportAgent,
        label: 'Agente de suporte (cursinho parceiro)',
        type: PermissionType.prepCourse,
      },
    ],
  },
];
