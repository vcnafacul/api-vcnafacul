import { Permissions } from 'src/modules/role/permissions/permissions';

/**
 * Catalogo das colunas da exportacao de matriculados.
 *
 * E a fonte unica: valida o `columns` que chega do cliente, decide o que o
 * modal do front pode oferecer e diz quais joins a consulta precisa. Coluna
 * fora daqui e rejeitada com 400 — o `columns` e entrada nao confiavel, e este
 * endpoint ja teve SQL injection (ticket 010) e ordenacao sem validacao
 * (ticket 012).
 */
export enum ExportColumnGroup {
  Identificacao = 'Identificação',
  Contato = 'Contato',
  Documentos = 'Documentos',
  Endereco = 'Endereço',
  Matricula = 'Matrícula',
  Progresso = 'Progresso',
  Responsavel = 'Responsável legal',
  Questionario = 'Questionário',
}

/** Relacoes que so entram na consulta se alguma coluna pedida precisar. */
export type ExportJoin = 'legalGuardian' | 'cancellationLog';

export interface ExportColumn {
  /** Identificador usado no parametro `columns`. */
  key: string;
  label: string;
  group: ExportColumnGroup;
  /**
   * Permissao necessaria para a coluna sequer ser oferecida. Sem ela, a coluna
   * nao aparece no modal e e rejeitada se vier na requisicao.
   */
  requires?: Permissions;
  /**
   * Permissao necessaria para ver o valor em claro. Sem ela a coluna ainda e
   * oferecida, mas o valor sai mascarado — mesmo comportamento que a listagem
   * e a exportacao de colunas fixas ja tinham.
   */
  clearRequires?: Permissions;
  join?: ExportJoin;
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  // --- Identificacao
  {
    key: 'cod_enrolled',
    label: 'Nº de matrícula',
    group: ExportColumnGroup.Identificacao,
  },
  { key: 'name', label: 'Nome', group: ExportColumnGroup.Identificacao },
  {
    key: 'socialName',
    label: 'Nome social',
    group: ExportColumnGroup.Identificacao,
  },
  {
    key: 'birthday',
    label: 'Nascimento',
    group: ExportColumnGroup.Identificacao,
  },
  { key: 'age', label: 'Idade', group: ExportColumnGroup.Identificacao },
  { key: 'gender', label: 'Gênero', group: ExportColumnGroup.Identificacao },

  // --- Contato
  // `email` e o da conta e `emailInscricao` o informado no formulario: o
  // updateUserInformation nao propaga email nem telefone da inscricao para o
  // usuario, entao os dois podem divergir e cada um serve a um proposito.
  {
    key: 'email',
    label: 'Email (conta)',
    group: ExportColumnGroup.Contato,
    clearRequires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'emailInscricao',
    label: 'Email (inscrição)',
    group: ExportColumnGroup.Contato,
    clearRequires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    group: ExportColumnGroup.Contato,
    clearRequires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'phone',
    label: 'Telefone (cadastro)',
    group: ExportColumnGroup.Contato,
    clearRequires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'urgencyPhone',
    label: 'Contato de referência',
    group: ExportColumnGroup.Contato,
    clearRequires: Permissions.gerenciarEstudantes,
  },

  // --- Documentos
  {
    key: 'cpf',
    label: 'CPF',
    group: ExportColumnGroup.Documentos,
    clearRequires: Permissions.gerenciarProcessoSeletivo,
  },
  {
    key: 'rg',
    label: 'RG',
    group: ExportColumnGroup.Documentos,
    clearRequires: Permissions.gerenciarProcessoSeletivo,
  },
  { key: 'uf', label: 'UF do RG', group: ExportColumnGroup.Documentos },

  // --- Endereco
  // Nao ha precedente de mascara para endereco na listagem. Em vez de inventar
  // uma, o grupo inteiro exige gerenciarEstudantes para ser oferecido.
  {
    key: 'street',
    label: 'Rua',
    group: ExportColumnGroup.Endereco,
    requires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'number',
    label: 'Número',
    group: ExportColumnGroup.Endereco,
    requires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'complement',
    label: 'Complemento',
    group: ExportColumnGroup.Endereco,
    requires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'neighborhood',
    label: 'Bairro',
    group: ExportColumnGroup.Endereco,
    requires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'postalCode',
    label: 'CEP',
    group: ExportColumnGroup.Endereco,
    requires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'city',
    label: 'Cidade',
    group: ExportColumnGroup.Endereco,
    requires: Permissions.gerenciarEstudantes,
  },
  {
    key: 'state',
    label: 'Estado',
    group: ExportColumnGroup.Endereco,
    requires: Permissions.gerenciarEstudantes,
  },

  // --- Matricula
  {
    key: 'schoolYear',
    label: 'Ano Letivo',
    group: ExportColumnGroup.Matricula,
  },
  {
    key: 'inscriptionCourse',
    label: 'Processo Seletivo',
    group: ExportColumnGroup.Matricula,
  },
  { key: 'class', label: 'Turma', group: ExportColumnGroup.Matricula },
  {
    key: 'applicationStatus',
    label: 'Status',
    group: ExportColumnGroup.Matricula,
  },
  {
    key: 'createdAt',
    label: 'Data de cadastro',
    group: ExportColumnGroup.Matricula,
  },
  { key: 'isFree', label: 'Isento', group: ExportColumnGroup.Matricula },
  {
    key: 'waitingList',
    label: 'Lista de espera',
    group: ExportColumnGroup.Matricula,
  },
  {
    key: 'selectEnrolledAt',
    label: 'Convocado em',
    group: ExportColumnGroup.Matricula,
  },
  {
    key: 'limitEnrolledAt',
    label: 'Prazo da convocação',
    group: ExportColumnGroup.Matricula,
  },
  {
    key: 'cancelledAt',
    label: 'Cancelado em',
    group: ExportColumnGroup.Matricula,
    join: 'cancellationLog',
  },
  {
    key: 'cancelJustification',
    label: 'Justificativa do cancelamento',
    group: ExportColumnGroup.Matricula,
    join: 'cancellationLog',
  },

  // --- Progresso
  {
    key: 'documentsDone',
    label: 'Documentos enviados',
    group: ExportColumnGroup.Progresso,
  },
  {
    key: 'photoDone',
    label: 'Foto enviada',
    group: ExportColumnGroup.Progresso,
  },
  {
    key: 'surveyDone',
    label: 'Questionário respondido',
    group: ExportColumnGroup.Progresso,
  },
  {
    key: 'lastAccess',
    label: 'Último acesso',
    group: ExportColumnGroup.Progresso,
  },

  // --- Responsavel legal
  // CPF e RG do responsavel ficam de fora: sao documentos de um terceiro que
  // nem e usuario da plataforma, e o `getStudentDetails` ja os mascara
  // incondicionalmente. O que se usa na pratica e o contato.
  {
    key: 'guardianName',
    label: 'Nome do responsável',
    group: ExportColumnGroup.Responsavel,
    requires: Permissions.gerenciarEstudantes,
    join: 'legalGuardian',
  },
  {
    key: 'guardianRelationship',
    label: 'Parentesco',
    group: ExportColumnGroup.Responsavel,
    requires: Permissions.gerenciarEstudantes,
    join: 'legalGuardian',
  },
  {
    key: 'guardianPhone',
    label: 'Telefone do responsável',
    group: ExportColumnGroup.Responsavel,
    requires: Permissions.gerenciarEstudantes,
    clearRequires: Permissions.gerenciarEstudantes,
    join: 'legalGuardian',
  },

  // --- Questionario
  // `socioeconomic` ficou fora desta versao: as perguntas variam por processo
  // seletivo, entao "uma coluna por pergunta" so e previsivel com o filtro de
  // processo seletivo aplicado. Decisao registrada para card proprio.
  {
    key: 'areaInterest',
    label: 'Áreas de interesse',
    group: ExportColumnGroup.Questionario,
  },
  {
    key: 'selectedCourses',
    label: 'Cursos selecionados',
    group: ExportColumnGroup.Questionario,
  },
];

/**
 * Selecao usada quando a requisicao nao manda `columns` — sao exatamente as
 * colunas fixas que a exportacao tinha antes deste recurso, para quem so quer
 * o comportamento anterior nao pagar nada pela mudanca.
 */
export const DEFAULT_EXPORT_COLUMNS = [
  'cod_enrolled',
  'name',
  'schoolYear',
  'inscriptionCourse',
  'class',
  'applicationStatus',
  'email',
  'whatsapp',
  'cpf',
  'birthday',
  'age',
];

export const EXPORT_COLUMNS_BY_KEY = new Map(
  EXPORT_COLUMNS.map((column) => [column.key, column]),
);
