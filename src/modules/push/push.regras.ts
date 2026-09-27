import { BadRequestException } from '@nestjs/common';

export const LIMITE_TITULO = 100;
export const LIMITE_CORPO = 500;
/** `sendEachForMulticast` aceita no máximo 500 tokens por chamada. */
export const TAMANHO_DO_LOTE = 500;

/**
 * ⚠️ **Só estes dois códigos apagam o aparelho.** `messaging/invalid-argument`
 * fica de fora de propósito: ele também vem quando o problema é o PAYLOAD, e aí
 * apagaria todos os aparelhos do envio de uma vez.
 */
export const ERROS_DE_TOKEN_MORTO = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Valida título, corpo e link.
 *
 * ⚠️ **O link só pode apontar para o próprio site** — caminho interno (`/…`)
 * ou URL absoluta com a origem do `FRONT_URL`. Senão a notificação vira
 * ferramenta de phishing com a marca do projeto. O SW (FE-02) confere de novo.
 */
export function validarPayload(payload: PushPayload, frontUrl: string): void {
  const titulo = payload.title?.trim() ?? '';
  const corpo = payload.body?.trim() ?? '';
  if (!titulo || titulo.length > LIMITE_TITULO) {
    throw new BadRequestException(
      `Título obrigatório, com até ${LIMITE_TITULO} caracteres`,
    );
  }
  if (!corpo || corpo.length > LIMITE_CORPO) {
    throw new BadRequestException(
      `Mensagem obrigatória, com até ${LIMITE_CORPO} caracteres`,
    );
  }
  if (
    payload.url != null &&
    payload.url !== '' &&
    !linkDoSite(payload.url, frontUrl)
  ) {
    throw new BadRequestException(
      'O link tem de ser um caminho do site (ex.: /simulados)',
    );
  }
}

export function linkDoSite(url: string, frontUrl: string): boolean {
  const origem = new URL(frontUrl).origin;
  // `//host` e `/\host` são relativos ao PROTOCOLO: o navegador sai do site.
  if (url.startsWith('/') && !/^\/[\/\\]/.test(url)) return true;
  try {
    return new URL(url).origin === origem;
  } catch {
    return false;
  }
}

export function emLotes<T>(itens: T[], tamanho = TAMANHO_DO_LOTE): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}
