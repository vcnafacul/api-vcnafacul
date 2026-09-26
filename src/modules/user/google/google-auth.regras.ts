import { randomBytes } from 'crypto';
import { User } from '../user.entity';

/** O que o Google devolve de quem entrou — o `validate` da strategy. */
export interface PerfilGoogle {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const DESTINO_PADRAO = '/dashboard';

/** Cookie do `nonce` do `state` — só vive durante a ida e volta ao Google. */
export const COOKIE_DO_STATE = 'google_state';
export const VALIDADE_DO_STATE_MS = 10 * 60 * 1000;

/**
 * Para onde voltar depois de entrar (card 01 de `login-com-google`).
 *
 * ⚠️ **Só caminho relativo.** `//site.com` começa com `/`, mas o navegador lê
 * como outro domínio — sem esta recusa, o botão do Google viraria um
 * redirecionador aberto com a cara do vcnafacul.
 */
export function sanitizarVoltar(voltar: unknown): string {
  if (typeof voltar !== 'string') return DESTINO_PADRAO;
  if (!voltar.startsWith('/') || voltar.startsWith('//')) return DESTINO_PADRAO;
  if (voltar.includes('\\')) return DESTINO_PADRAO;
  return voltar;
}

/**
 * O token do link do convite, carregado pelo `state` e pelo token de cadastro
 * (card 05 de `login-com-google`). ⚠️ O módulo de usuário **não o interpreta**
 * — só o leva; quem confere é o módulo do convite. Aqui só se recusa o que
 * nem tem a forma de um (o token é `randomBytes(32)` em base64url).
 */
export function sanitizarConvite(convite: unknown): string | undefined {
  if (typeof convite !== 'string') return undefined;
  return /^[A-Za-z0-9_-]{16,128}$/.test(convite) ? convite : undefined;
}

export function gerarNonce(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * O `state` do OAuth: o `nonce` (conferido com o cookie na volta) e o
 * `voltar`.
 *
 * ⚠️ O `nonce` é o que impede o **CSRF de login**: sem ele, um site de
 * terceiros mandaria o navegador da vítima ao callback com o `code` da conta
 * Google do atacante, e a vítima ficaria logada na conta dele.
 */
export function montarState(
  nonce: string,
  voltar: string,
  convite?: string,
): string {
  return Buffer.from(
    JSON.stringify({ n: nonce, v: voltar, c: convite }),
  ).toString('base64url');
}

export function lerState(
  state: unknown,
): { nonce: string; voltar: string; convite?: string } | null {
  if (typeof state !== 'string' || !state) return null;
  try {
    const { n, v, c } = JSON.parse(Buffer.from(state, 'base64url').toString());
    if (typeof n !== 'string' || !n) return null;
    return {
      nonce: n,
      voltar: sanitizarVoltar(v),
      convite: sanitizarConvite(c),
    };
  } catch {
    return null;
  }
}

export type ErroDoGoogle = 'google' | 'sem-conta' | 'conta-removida';

export type Entrada =
  | {
      acao: 'entrar';
      usuario: User;
      vincular: boolean;
      confirmarEmail: boolean;
    }
  | { acao: 'recusar'; erro: ErroDoGoogle }
  | { acao: 'sem-conta' };

/**
 * Quem entra, dado o que achou pelo `googleId` e pelo email.
 *
 * - Achou pelo `googleId`: é a pessoa.
 * - Achou só pelo email: vincula o `googleId` — e, se o email ainda estava
 *   pendente de confirmação, **confirma** (decisão de 2026-09-25: o Google já
 *   provou que o email é dela).
 * - Achou pelo email uma conta ligada a **outro** `googleId`: recusa. Não
 *   deveria acontecer (o email do Google é único), e se acontecer, trocar o
 *   vínculo em silêncio entregaria a conta a outra pessoa.
 */
export function decidirEntrada(
  porGoogleId: User | null,
  porEmail: User | null,
  perfil: PerfilGoogle,
): Entrada {
  if (porGoogleId) {
    if (porGoogleId.deletedAt)
      return { acao: 'recusar', erro: 'conta-removida' };
    return {
      acao: 'entrar',
      usuario: porGoogleId,
      vincular: false,
      confirmarEmail: false,
    };
  }
  if (!porEmail) return { acao: 'sem-conta' };
  if (porEmail.deletedAt) return { acao: 'recusar', erro: 'conta-removida' };
  if (porEmail.googleId && porEmail.googleId !== perfil.googleId) {
    return { acao: 'recusar', erro: 'google' };
  }
  return {
    acao: 'entrar',
    usuario: porEmail,
    vincular: !porEmail.googleId,
    // `emailConfirmSended` é null quando confirmado; data = aguardando
    confirmarEmail: porEmail.emailConfirmSended != null,
  };
}
