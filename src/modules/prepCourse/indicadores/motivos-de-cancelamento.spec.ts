import { motivoDoCancelamento } from './motivos-de-cancelamento';

describe('motivoDoCancelamento', () => {
  it('rótulo da lista vale como está', () => {
    expect(motivoDoCancelamento('Transporte')).toBe('Transporte');
    expect(motivoDoCancelamento('Desistência inicial')).toBe(
      'Desistência inicial',
    );
  });

  it('"Outros: <texto>" vira Outros', () => {
    expect(motivoDoCancelamento('Outros: mudou de cidade')).toBe('Outros');
  });

  it('texto livre antigo e vazio viram "Sem motivo na lista"', () => {
    expect(motivoDoCancelamento('foi embora')).toBe('Sem motivo na lista');
    expect(motivoDoCancelamento('Matrícula cancelada')).toBe(
      'Sem motivo na lista',
    );
    expect(motivoDoCancelamento(null)).toBe('Sem motivo na lista');
  });
});
