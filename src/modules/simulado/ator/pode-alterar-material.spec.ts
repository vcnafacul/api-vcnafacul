import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  garantirQuePodeAlterar,
  motivoParaNaoAlterar,
  TEXTO_DE_OUTRO_CURSINHO,
  TEXTO_OFICIAL,
} from './pode-alterar-material';

const doCursinhoA = { cursinhoId: 'A', protegida: false };
const plataforma = { cursinhoId: null };
const deA = { cursinhoId: 'A' };

describe('motivoParaNaoAlterar (tickets-documentacao, 30)', () => {
  it('equipe da plataforma (sem cursinho) altera qualquer uma', () => {
    expect(motivoParaNaoAlterar(doCursinhoA, plataforma)).toBeNull();
    expect(motivoParaNaoAlterar({ cursinhoId: null }, plataforma)).toBeNull();
  });

  it('o próprio cursinho altera a sua', () => {
    expect(motivoParaNaoAlterar(doCursinhoA, deA)).toBeNull();
  });

  it('⚠️ outro cursinho não altera', () => {
    expect(motivoParaNaoAlterar(doCursinhoA, { cursinhoId: 'B' })).toBe(
      TEXTO_DE_OUTRO_CURSINHO,
    );
  });

  it('⚠️ prova oficial: nenhum cursinho altera', () => {
    expect(motivoParaNaoAlterar({ cursinhoId: null }, deA)).toBe(TEXTO_OFICIAL);
    expect(
      motivoParaNaoAlterar({ cursinhoId: 'A', protegida: true }, deA),
    ).toBe(TEXTO_OFICIAL);
    // simulado: vem com a categoria
    expect(
      motivoParaNaoAlterar(
        { cursinhoId: 'A', categoria: { dono: 'system' } },
        deA,
      ),
    ).toBe(TEXTO_OFICIAL);
    expect(
      motivoParaNaoAlterar({ cursinhoId: 'A', categoria: { dono: 'A' } }, deA),
    ).toBeNull();
  });

  it('garantirQuePodeAlterar: 404 sem material, 403 sem permissão', () => {
    expect(() => garantirQuePodeAlterar(null, deA)).toThrow(NotFoundException);
    expect(() =>
      garantirQuePodeAlterar(doCursinhoA, { cursinhoId: 'B' }),
    ).toThrow(ForbiddenException);
    expect(() => garantirQuePodeAlterar(doCursinhoA, deA)).not.toThrow();
  });
});
