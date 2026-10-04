import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Ator } from './ator';

/** `dono` das categorias da plataforma (ms-simulado, `DONO_SYSTEM`). */
export const DONO_DA_PLATAFORMA = 'system';

export interface DonoDoMaterial {
  cursinhoId?: string | null;
  /** O ms já calcula para a prova (`resumoDoDono`). */
  protegida?: boolean;
  /** Para o simulado, que vem com a categoria. */
  categoria?: { dono?: string | null; selecionavel?: boolean | null } | null;
}

/** Sem dono, categoria da plataforma ou fora de uso: é oficial. */
export function ehOficial(m: DonoDoMaterial): boolean {
  if (!m.cursinhoId) return true;
  if (m.protegida) return true;
  if (m.categoria) {
    return (
      (m.categoria.dono ?? DONO_DA_PLATAFORMA) === DONO_DA_PLATAFORMA ||
      m.categoria.selecionavel === false
    );
  }
  return false;
}

export const TEXTO_DE_OUTRO_CURSINHO =
  'Esta prova pertence a outro cursinho e não pode ser alterada por você.';
export const TEXTO_OFICIAL =
  'Esta é uma prova oficial da plataforma e não pode ser alterada pelo cursinho.';

/**
 * Quem altera arquivos e janela de uma prova/simulado (tickets-documentacao,
 * card 30):
 * - equipe da plataforma (sem cursinho): qualquer um;
 * - colaborador de cursinho: só os do próprio cursinho, e nunca os oficiais.
 *
 * ⚠️ As rotas só conferiam `cadastrarProvas`, que uma função de cursinho pode
 * herdar do perfil base: aí ela trocava o PDF ou fechava o simulado de
 * outro cursinho — ou do ENEM.
 */
export function motivoParaNaoAlterar(
  m: DonoDoMaterial,
  ator: Pick<Ator, 'cursinhoId'>,
): string | null {
  if (!ator.cursinhoId) return null;
  if (ehOficial(m)) return TEXTO_OFICIAL;
  if (m.cursinhoId !== ator.cursinhoId) return TEXTO_DE_OUTRO_CURSINHO;
  return null;
}

/** Lança 404 (não existe) ou 403 (não pode); devolve se pode. */
export function garantirQuePodeAlterar(
  m: DonoDoMaterial | null | undefined,
  ator: Pick<Ator, 'cursinhoId'>,
  oQue = 'Prova',
): void {
  if (!m) throw new NotFoundException(`${oQue} não encontrada`);
  const motivo = motivoParaNaoAlterar(m, ator);
  if (motivo) throw new ForbiddenException(motivo);
}
