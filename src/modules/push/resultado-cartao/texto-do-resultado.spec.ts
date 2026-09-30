import { textoDoResultado } from './texto-do-resultado';

describe('textoDoResultado (028 · 03)', () => {
  const r = (over = {}) => ({
    historicoId: 'h1',
    simulado: 'Simulado de outubro',
    acertos: 61,
    erros: 25,
    emBranco: 4,
    aproveitamento: 68,
    envios: 0,
    ...over,
  });

  it('primeiro envio: aproveitamento, acertos, erros e em branco; link do aproveitamento', () => {
    expect(textoDoResultado(r())).toEqual({
      title: '📊 Resultado: Simulado de outubro',
      body: 'Aproveitamento 68% · 61 acertos · 25 erros · 4 em branco. Toque para ver os detalhes.',
      url: '/dashboard/simulado/aproveitamento/h1',
      tag: 'resultado-h1',
    });
  });

  it('sem questões em branco, não fala delas; singular quando é 1', () => {
    expect(
      textoDoResultado(r({ emBranco: 0, acertos: 1, erros: 1 })).body,
    ).toBe(
      'Aproveitamento 68% · 1 acerto · 1 erro. Toque para ver os detalhes.',
    );
  });

  it('reenvio: "Resultado atualizado"', () => {
    expect(textoDoResultado(r({ envios: 1 })).title).toBe(
      '📊 Resultado atualizado: Simulado de outubro',
    );
  });

  it('título longo cortado em 100', () => {
    expect(
      textoDoResultado(r({ simulado: 'x'.repeat(200) })).title.length,
    ).toBeLessThanOrEqual(100);
  });
});
