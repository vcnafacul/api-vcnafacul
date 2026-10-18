import { Period } from '../user/enum/period';
import { serieCompleta } from './serie-completa';

describe('serieCompleta (044/02)', () => {
  it('mês: preenche os buracos e vira o ano', () => {
    expect(serieCompleta(Period.month, ['2026-01', '2025-11'])).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
  });

  it('dia: atravessa o fim do mês e o ano bissexto', () => {
    expect(serieCompleta(Period.day, ['2028-03-01', '2028-02-28'])).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ]);
  });

  it('ano e vazio', () => {
    expect(serieCompleta(Period.year, ['2024', '2026'])).toEqual([
      '2024',
      '2025',
      '2026',
    ]);
    expect(serieCompleta(Period.month, [])).toEqual([]);
  });
});
