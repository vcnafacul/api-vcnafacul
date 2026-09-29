import {
  gerarSlug,
  primeiroSlugLivre,
  quemSomosVazio,
  slugValido,
  temImagem,
} from './regras-da-pagina';

describe('regras da página do cursinho (025 · 01)', () => {
  it.each([
    ['Cursinho Popular São João', 'cursinho-popular-sao-joao'],
    ['  Ação & Cia!! ', 'acao-cia'],
    ['EDUCAFRO — Núcleo 3', 'educafro-nucleo-3'],
    ['Pré-Vestibular   Comunitário', 'pre-vestibular-comunitario'],
    ['Já', 'cursinho-ja'],
    ['!!!', 'cursinho'],
    ['', 'cursinho'],
  ])('gerarSlug(%p) → %p', (nome, esperado) => {
    const slug = gerarSlug(nome);
    expect(slug).toBe(esperado);
    expect(slugValido(slug)).toBe(true);
  });

  it('gerarSlug corta em 60 sem deixar hífen na ponta', () => {
    const slug = gerarSlug(`${'a'.repeat(59)} b`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });

  it.each([
    ['ok-slug', true],
    ['ab', false],
    ['a'.repeat(61), false],
    ['Maiuscula', false],
    ['com espaco', false],
    ['acentuação', false],
    ['-ponta', false],
    ['ponta-', false],
    ['duplo--hifen', false],
  ])('slugValido(%p) → %p', (slug, esperado) => {
    expect(slugValido(slug)).toBe(esperado);
  });

  it('primeiroSlugLivre põe -2, -3… e respeita os 60', async () => {
    const usados = new Set(['x-y', 'x-y-2']);
    expect(await primeiroSlugLivre('x-y', async (s) => usados.has(s))).toBe(
      'x-y-3',
    );
    expect(await primeiroSlugLivre('livre', async () => false)).toBe('livre');

    const longo = 'a'.repeat(60);
    const r = await primeiroSlugLivre(longo, async (s) => s === longo);
    expect(r).toHaveLength(60);
    expect(r.endsWith('-2')).toBe(true);
  });

  it.each([
    [null, true],
    ['', true],
    ['   \n ', true],
    ['**  **\n# ', true],
    ['Somos um cursinho', false],
  ])('quemSomosVazio(%p) → %p', (texto, esperado) => {
    expect(quemSomosVazio(texto)).toBe(esperado);
  });

  it('temImagem pega markdown e <img>', () => {
    expect(temImagem('olha ![foto](https://x/y.png)')).toBe(true);
    expect(temImagem('<IMG src="x">')).toBe(true);
    expect(temImagem('um [link](https://x) comum')).toBe(false);
  });
});
