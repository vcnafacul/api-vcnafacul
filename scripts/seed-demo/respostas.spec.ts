import { montarResposta } from './respostas';
import { reiniciarAleatorio } from './aleatorio';

const fixture = {
  respostaBase: { 'Cor/raça': 'Parda', 'Renda familiar': 'Até 1 salário' },
  variacoes: {
    'Renda familiar': [
      { resposta: 'Até 1 salário', peso: 1 },
      { resposta: 'De 1 a 3 salários', peso: 1 },
    ],
  },
};

describe('montarResposta', () => {
  beforeEach(reiniciarAleatorio);

  it('mantém a resposta base nas perguntas sem variação', () => {
    expect(montarResposta(fixture)['Cor/raça']).toBe('Parda');
  });

  it('varia as perguntas pontuadas entre as opções dadas', () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 50; i++)
      vistas.add(montarResposta(fixture)['Renda familiar'] as string);
    expect(vistas).toEqual(new Set(['Até 1 salário', 'De 1 a 3 salários']));
  });

  it('mantém número como número (pergunta Number)', () => {
    const comNumero = {
      respostaBase: { Pessoas: 4 },
      variacoes: {
        Pessoas: [
          { resposta: 3, peso: 1 },
          { resposta: 5, peso: 1 },
        ],
      },
    };
    const vistas = new Set<unknown>();
    for (let i = 0; i < 50; i++) vistas.add(montarResposta(comNumero).Pessoas);
    expect(vistas).toEqual(new Set([3, 5]));
  });
});
