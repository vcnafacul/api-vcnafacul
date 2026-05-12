const ASSET_PATTERN = /asset:\/\/([a-zA-Z0-9._-]+)/gi;

export function parseAssetIds(markdown: string | null | undefined): string[] {
  if (!markdown) return [];
  const ids = new Set<string>();
  for (const match of markdown.matchAll(ASSET_PATTERN)) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}
