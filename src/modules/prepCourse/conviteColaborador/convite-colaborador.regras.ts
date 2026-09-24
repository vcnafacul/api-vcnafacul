import { createHash, randomBytes } from 'crypto';
import { StatusDoConvite } from './convite-colaborador.entity';

/** 7 dias — decidido na conversa de 2026-09-24. */
export const VALIDADE_DO_CONVITE_MS = 7 * 24 * 60 * 60 * 1000;

export type SituacaoDoConvite =
  | 'pendente'
  | 'expirado'
  | 'aceito'
  | 'cancelado';

/**
 * A situação que a tela mostra. ⚠️ `pendente` vencido é `expirado` — o status
 * gravado só muda por ação, a data decide o resto.
 */
export function situacaoDoConvite(
  convite: { status: StatusDoConvite; expiraEm: Date },
  agora: Date,
): SituacaoDoConvite {
  if (convite.status === StatusDoConvite.pendente) {
    return convite.expiraEm > agora ? 'pendente' : 'expirado';
  }
  return convite.status;
}

/** `trim` + minúsculas — é a chave da regra "um pendente por email × cursinho". */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Token opaco do link e o hash que vai para o banco.
 *
 * ⚠️ **Não é JWT** — não é assinado com o `APP_KEY`, então não tem como virar
 * credencial de login (o problema do card 01 some por construção).
 */
export function gerarTokenDeConvite(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashDoToken(token) };
}

export function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** "01/10" — a data da validade, no fuso de quem usa. */
export function dataCurta(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

/** O que dizer a quem abre um link que não vale mais. */
export const MENSAGEM_DA_SITUACAO: Record<
  Exclude<SituacaoDoConvite, 'pendente'>,
  string
> = {
  expirado:
    'Este convite expirou. Peça à coordenação do cursinho que envie um novo.',
  aceito: 'Este convite já foi aceito.',
  cancelado: 'Este convite foi cancelado pela coordenação do cursinho.',
};
