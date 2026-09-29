/**
 * Regras puras da página do cursinho (tickets/025, R1, R3, R4).
 */

export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const QUEM_SOMOS_MAX = 10000;
export const LINKS_MAX = 20;

/** Chave do cache da página pública (card 04), invalidada no salvar. */
export const chaveDaPaginaPublica = (slug: string) => `cursinho:pagina:${slug}`;

export function slugValido(slug: string): boolean {
  return (
    typeof slug === 'string' &&
    slug.length >= SLUG_MIN &&
    slug.length <= SLUG_MAX &&
    SLUG_VALIDO.test(slug)
  );
}

/**
 * O slug a partir do nome: minúsculas, sem acento, tudo que não é `a-z0-9`
 * vira `-`, sem `-` repetido nem nas pontas, até 60. Curto demais ganha o
 * prefixo `cursinho-`.
 */
export function gerarSlug(nome: string): string {
  const base = (nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
  if (base.length >= SLUG_MIN) return base;
  return (
    `cursinho-${base}`.replace(/-+$/g, '').slice(0, SLUG_MAX) || 'cursinho'
  );
}

/** O primeiro livre entre `base`, `base-2`, `base-3`… (respeitando os 60). */
export async function primeiroSlugLivre(
  base: string,
  emUso: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await emUso(base))) return base;
  for (let n = 2; ; n++) {
    const sufixo = `-${n}`;
    const candidato = `${base.slice(0, SLUG_MAX - sufixo.length).replace(/-+$/g, '')}${sufixo}`;
    if (!(await emUso(candidato))) return candidato;
  }
}

/** "Quem somos" sem texto de verdade: vazio, só espaços ou só marcação. */
export function quemSomosVazio(texto: string | null | undefined): boolean {
  return !(texto ?? '').replace(/[\s#*_>`~\-[\]()|\\]/g, '');
}

/** Imagem em markdown ou `<img>` cru: o "Quem somos" não aceita (R4). */
export function temImagem(texto: string | null | undefined): boolean {
  return /!\[[^\]]*\]\([^)]*\)|<img\b/i.test(texto ?? '');
}
