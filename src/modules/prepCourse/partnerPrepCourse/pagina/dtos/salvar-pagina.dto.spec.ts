import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SalvarPaginaDtoInput } from './salvar-pagina.dto';

const erros = (corpo: object) =>
  validateSync(plainToInstance(SalvarPaginaDtoInput, corpo)).map(
    (e) => e.property,
  );

describe('SalvarPaginaDtoInput (025 · 01)', () => {
  const ok = {
    slug: 'x-y',
    quemSomos: 'texto',
    active: false,
    linksPublicos: [{ titulo: 'Site', url: 'https://a.org' }],
    linksInternos: [],
  };

  it('corpo válido passa', () => {
    expect(erros(ok)).toEqual([]);
  });

  it.each(['javascript:alert(1)', 'ftp://a.org', 'a.org', ''])(
    'url %p é recusada',
    (url) => {
      expect(erros({ ...ok, linksPublicos: [{ titulo: 'x', url }] })).toContain(
        'linksPublicos',
      );
    },
  );

  it('link sem título e mais de 20 links são recusados', () => {
    expect(
      erros({ ...ok, linksInternos: [{ titulo: '', url: 'https://a' }] }),
    ).toContain('linksInternos');
    const muitos = Array.from({ length: 21 }, () => ({
      titulo: 't',
      url: 'https://a.org',
    }));
    expect(erros({ ...ok, linksPublicos: muitos })).toContain('linksPublicos');
  });

  it('Quem somos acima de 10.000 caracteres é recusado', () => {
    expect(erros({ ...ok, quemSomos: 'a'.repeat(10001) })).toContain(
      'quemSomos',
    );
  });
});
