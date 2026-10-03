/**
 * Quem pode dar qual função a quem, dentro de um cursinho (card 02 de
 * `convite-de-colaborador`).
 *
 * ⚠️ **Antes, o `PATCH user/updateRole` não conferia nada disso**: com
 * `gerenciarPermissoesCursinho`, o gestor de um cursinho dava QUALQUER função
 * (inclusive a `admin` da plataforma) a QUALQUER usuário.
 *
 * Dois níveis (decididos 2026-09-24):
 * - `gerenciarPermissoesCursinho` (o admin do cursinho): qualquer colaborador
 *   ativo do cursinho, qualquer função do cursinho;
 * - `gerenciarColaboradores`: o mesmo, mas **sem escalada** — não dá função de
 *   admin, não mexe no admin, não mexe em si.
 */
export enum MotivoParaNaoAtribuir {
  alvoForaDoCursinho = 'alvo-fora-do-cursinho',
  alvoInativo = 'alvo-inativo',
  funcaoForaDoCursinho = 'funcao-fora-do-cursinho',
  funcaoDeAdmin = 'funcao-de-admin',
  alvoEhAdmin = 'alvo-eh-admin',
  propriaFuncao = 'propria-funcao',
}

export const TEXTO_DO_MOTIVO: Record<MotivoParaNaoAtribuir, string> = {
  [MotivoParaNaoAtribuir.alvoForaDoCursinho]:
    'Esta pessoa não é colaboradora deste cursinho.',
  [MotivoParaNaoAtribuir.alvoInativo]:
    'Este colaborador está inativo — ative-o antes de trocar a função.',
  [MotivoParaNaoAtribuir.funcaoForaDoCursinho]:
    'Esta função não pertence a este cursinho.',
  [MotivoParaNaoAtribuir.funcaoDeAdmin]:
    'Só o administrador do cursinho pode atribuir uma função de administração.',
  [MotivoParaNaoAtribuir.alvoEhAdmin]:
    'Só o administrador do cursinho pode trocar a função de outro administrador.',
  [MotivoParaNaoAtribuir.propriaFuncao]:
    'Você não pode trocar a sua própria função.',
};

/** O que o service mede antes de decidir. */
export interface SituacaoDaAtribuicao {
  quemPedeId: string;
  /** Quem pede tem `gerenciarPermissoesCursinho`. */
  quemPedeEhAdmin: boolean;
  /** O cursinho de quem pede. */
  cursinhoId: string;
  /** `null` = o usuário alvo não é colaborador de cursinho nenhum. */
  alvo: {
    userId: string;
    cursinhoId: string | null;
    ativo: boolean;
    /** A função atual do alvo tem `gerenciarPermissoesCursinho`. */
    ehAdmin: boolean;
  } | null;
  funcao: {
    /** `null` = função da plataforma, sem cursinho. */
    cursinhoId: string | null;
    /** A função tem `gerenciarPermissoesCursinho`. */
    ehDeAdmin: boolean;
  };
}

/**
 * Todos os motivos que impedem a atribuição; vazio = pode.
 *
 * ⚠️ As regras de escopo valem para os dois níveis; as de escalada, só para
 * quem não é admin.
 */
export function motivosParaNaoAtribuir(
  s: SituacaoDaAtribuicao,
): MotivoParaNaoAtribuir[] {
  const m: MotivoParaNaoAtribuir[] = [];
  const doCursinho = !!s.alvo && s.alvo.cursinhoId === s.cursinhoId;

  if (!doCursinho) m.push(MotivoParaNaoAtribuir.alvoForaDoCursinho);
  else if (!s.alvo!.ativo) m.push(MotivoParaNaoAtribuir.alvoInativo);
  if (s.funcao.cursinhoId !== s.cursinhoId) {
    m.push(MotivoParaNaoAtribuir.funcaoForaDoCursinho);
  }

  if (!s.quemPedeEhAdmin) {
    if (s.funcao.ehDeAdmin) m.push(MotivoParaNaoAtribuir.funcaoDeAdmin);
    if (doCursinho && s.alvo!.ehAdmin)
      m.push(MotivoParaNaoAtribuir.alvoEhAdmin);
    if (s.alvo?.userId === s.quemPedeId) {
      m.push(MotivoParaNaoAtribuir.propriaFuncao);
    }
  }
  return m;
}

/**
 * Quem pode inativar ou reativar qual colaborador (tickets-documentacao,
 * card 02). Inativar tira a função (vira `aluno`) e reativar a devolve — então
 * valem as mesmas regras de escopo e de escalada da troca de função.
 *
 * ⚠️ Antes, `PATCH collaborator/:id/active` não conferia nada: quem gerenciava
 * colaboradores de um cursinho inativava colaborador de OUTRO, o próprio admin
 * do cursinho ou a si mesmo.
 */
export enum MotivoParaNaoAtivar {
  alvoForaDoCursinho = 'alvo-fora-do-cursinho',
  alvoEhAdmin = 'alvo-eh-admin',
  proprioCadastro = 'proprio-cadastro',
}

export const TEXTO_DO_MOTIVO_DE_ATIVACAO: Record<MotivoParaNaoAtivar, string> =
  {
    [MotivoParaNaoAtivar.alvoForaDoCursinho]:
      TEXTO_DO_MOTIVO[MotivoParaNaoAtribuir.alvoForaDoCursinho],
    [MotivoParaNaoAtivar.alvoEhAdmin]:
      'Só o administrador do cursinho pode inativar ou reativar outro administrador.',
    [MotivoParaNaoAtivar.proprioCadastro]:
      'Você não pode inativar o seu próprio cadastro.',
  };

export interface SituacaoDaAtivacao {
  quemPedeId: string;
  /** Quem pede tem `gerenciarPermissoesCursinho`. */
  quemPedeEhAdmin: boolean;
  /** O cursinho de quem pede. */
  cursinhoId: string;
  alvo: {
    userId: string;
    cursinhoId: string | null;
    /**
     * A função em jogo tem `gerenciarPermissoesCursinho`: ao inativar, a
     * atual; ao reativar, a que vai ser devolvida.
     */
    ehAdmin: boolean;
  };
}

/**
 * Todos os motivos que impedem; vazio = pode. Escopo e "a si mesmo" valem para
 * os dois níveis (nem o admin se inativa: o cursinho ficaria sem quem o
 * reative); a escalada, só para quem não é admin.
 */
export function motivosParaNaoAtivar(
  s: SituacaoDaAtivacao,
): MotivoParaNaoAtivar[] {
  const m: MotivoParaNaoAtivar[] = [];
  if (s.alvo.cursinhoId !== s.cursinhoId) {
    return [MotivoParaNaoAtivar.alvoForaDoCursinho];
  }
  if (s.alvo.userId === s.quemPedeId)
    m.push(MotivoParaNaoAtivar.proprioCadastro);
  if (!s.quemPedeEhAdmin && s.alvo.ehAdmin) {
    m.push(MotivoParaNaoAtivar.alvoEhAdmin);
  }
  return m;
}
