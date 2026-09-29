/**
 * Imagens do texto motivador (mesmo padrão das Novidades e do banco de
 * questões): o markdown guarda `![alt](asset://<id>)` e o arquivo fica no
 * BUCKET_ESSAY, sob um prefixo só dos temas.
 *
 * ⚠️ O prefixo isola as imagens dos temas dos manuscritos dos alunos, que
 * moram no mesmo bucket: a rota pública (a qualquer logado) de imagem de tema
 * só alcança chaves sob `essay-themes/`, nunca uma redação.
 */
export const PREFIXO_DO_TEMA = 'essay-themes';

/** O id guardado no markdown é só `<uuid>.<ext>`; a chave no bucket leva o prefixo. */
export const chaveNoBucket = (assetId: string) =>
  `${PREFIXO_DO_TEMA}/${assetId}`;

/** Sem barra, sem `..`: o id não escapa do prefixo. */
export const ASSET_ID_VALIDO = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;

/** Os formatos que Claude e OpenAI aceitam como imagem. */
export const EXTENSAO_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const TAMANHO_MAXIMO = 5 * 1024 * 1024;

const IMAGEM_NO_MARKDOWN = /!\[[^\]]*\]\(asset:\/\/([a-zA-Z0-9._-]+)[^)]*\)/g;

/**
 * O texto motivador para a IA: cada imagem vira um marcador `[Imagem N]`, na
 * ordem em que aparece, e os ids voltam na mesma ordem para irem anexados.
 * A mesma imagem repetida reusa o número.
 */
export function textoMotivadorParaIA(markdown: string): {
  texto: string;
  assetIds: string[];
} {
  const assetIds: string[] = [];
  const texto = (markdown ?? '').replace(IMAGEM_NO_MARKDOWN, (_m, id) => {
    let i = assetIds.indexOf(id);
    if (i === -1) i = assetIds.push(id) - 1;
    return `[Imagem ${i + 1}]`;
  });
  return { texto, assetIds };
}
