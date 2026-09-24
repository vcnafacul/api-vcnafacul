import { StatusDoConvite } from './convite-colaborador.entity';
import {
  dataCurta,
  gerarTokenDeConvite,
  hashDoToken,
  normalizarEmail,
  situacaoDoConvite,
} from './convite-colaborador.regras';

const agora = new Date('2026-09-24T12:00:00Z');
const amanha = new Date('2026-09-25T12:00:00Z');
const ontem = new Date('2026-09-23T12:00:00Z');

describe('situacaoDoConvite', () => {
  it('pendente dentro da data: pendente', () => {
    expect(
      situacaoDoConvite(
        { status: StatusDoConvite.pendente, expiraEm: amanha },
        agora,
      ),
    ).toBe('pendente');
  });

  it('⚠️ pendente VENCIDO é expirado — sem job, a data decide', () => {
    expect(
      situacaoDoConvite(
        { status: StatusDoConvite.pendente, expiraEm: ontem },
        agora,
      ),
    ).toBe('expirado');
  });

  it('aceito e cancelado ficam como estão, qualquer que seja a data', () => {
    for (const status of [StatusDoConvite.aceito, StatusDoConvite.cancelado]) {
      expect(situacaoDoConvite({ status, expiraEm: ontem }, agora)).toBe(
        status,
      );
    }
  });
});

describe('normalizarEmail', () => {
  it('⚠️ espaço e maiúscula não furam a regra de duplicado', () => {
    expect(normalizarEmail('  Ana@Cursinho.COM ')).toBe('ana@cursinho.com');
  });
});

describe('gerarTokenDeConvite', () => {
  it('o hash é o do token, e o token não é JWT', () => {
    const { token, hash } = gerarTokenDeConvite();

    expect(hash).toBe(hashDoToken(token));
    expect(hash).toHaveLength(64);
    expect(token.split('.')).toHaveLength(1);
  });

  it('cada convite tem um token diferente', () => {
    expect(gerarTokenDeConvite().token).not.toBe(gerarTokenDeConvite().token);
  });
});

describe('dataCurta', () => {
  it('dd/mm no fuso de São Paulo', () => {
    // 01/10 às 01h UTC ainda é 30/09 em São Paulo.
    expect(dataCurta(new Date('2026-10-01T01:00:00Z'))).toBe('30/09');
  });
});
