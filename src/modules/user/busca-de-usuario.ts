/**
 * As palavras de uma busca de usuário (card 02 de `tela-de-usuarios`).
 *
 * ⚠️ **Cada palavra tem de casar — E, não OU.** Antes o termo inteiro
 * precisava caber num campo só: "Maria Silva" não casava com `firstName =
 * "Maria"` nem com `lastName = "Silva"`, e nome completo não achava ninguém.
 * Palavra por palavra, "Maria Silva" também acha "Maria da Silva".
 *
 * ⚠️ `%` e `_` são curinga do `LIKE` — escapados, senão "%" casaria com a base
 * inteira.
 */
export function palavrasDaBusca(texto: string | undefined | null): string[] {
  return (texto ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.replace(/[\\%_]/g, (c) => `\\${c}`));
}
