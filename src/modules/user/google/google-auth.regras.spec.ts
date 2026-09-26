import { User } from '../user.entity';
import {
  DESTINO_PADRAO,
  PerfilGoogle,
  decidirEntrada,
  lerState,
  montarState,
  sanitizarConvite,
  sanitizarVoltar,
} from './google-auth.regras';

const perfil: PerfilGoogle = {
  googleId: 'g-1',
  email: 'ana@gmail.com',
  firstName: 'Ana',
  lastName: 'Silva',
};

const usuario = (campos: Partial<User> = {}) =>
  Object.assign(new User(), { id: 'u-1', emailConfirmSended: null }, campos);

describe('sanitizarVoltar', () => {
  it.each([
    ['/cadastro?convite=abc', '/cadastro?convite=abc'],
    ['/dashboard', '/dashboard'],
  ])('aceita caminho relativo %s', (entrada, esperado) => {
    expect(sanitizarVoltar(entrada)).toBe(esperado);
  });

  it.each([
    ['//site-malicioso.com'],
    ['/\\site-malicioso.com'],
    ['https://site-malicioso.com'],
    ['javascript:alert(1)'],
    [''],
    [undefined],
    [['/a', '/b']],
  ])('recusa %p e cai no destino padrão', (entrada) => {
    expect(sanitizarVoltar(entrada)).toBe(DESTINO_PADRAO);
  });
});

describe('state', () => {
  it('ida e volta preservam nonce e voltar', () => {
    expect(lerState(montarState('n1', '/convite'))).toEqual({
      nonce: 'n1',
      voltar: '/convite',
    });
  });

  it('o voltar é sanitizado também na volta — o state vem da URL', () => {
    expect(lerState(montarState('n1', '//site.com'))?.voltar).toBe(
      DESTINO_PADRAO,
    );
  });

  it.each([[undefined], [''], ['lixo'], [montarState('', '/x')]])(
    'state inválido %p vira null',
    (state) => {
      expect(lerState(state)).toBeNull();
    },
  );
});

describe('decidirEntrada', () => {
  it('achou pelo googleId: entra sem vincular', () => {
    const u = usuario({ googleId: 'g-1' });
    expect(decidirEntrada(u, null, perfil)).toEqual({
      acao: 'entrar',
      usuario: u,
      vincular: false,
      confirmarEmail: false,
    });
  });

  it('achou só pelo email: vincula', () => {
    const u = usuario();
    expect(decidirEntrada(null, u, perfil)).toMatchObject({
      acao: 'entrar',
      vincular: true,
      confirmarEmail: false,
    });
  });

  it('email pendente de confirmação: confirma (decisão de 2026-09-25)', () => {
    const u = usuario({ emailConfirmSended: new Date() });
    expect(decidirEntrada(null, u, perfil)).toMatchObject({
      acao: 'entrar',
      confirmarEmail: true,
    });
  });

  it('conta do email ligada a OUTRO googleId: recusa', () => {
    const u = usuario({ googleId: 'g-outro' });
    expect(decidirEntrada(null, u, perfil)).toEqual({
      acao: 'recusar',
      erro: 'google',
    });
  });

  it.each([
    ['pelo googleId', true],
    ['pelo email', false],
  ])('conta removida (%s): recusa', (_, peloGoogleId) => {
    const u = usuario({ googleId: 'g-1', deletedAt: new Date() });
    const entrada = peloGoogleId
      ? decidirEntrada(u, null, perfil)
      : decidirEntrada(null, u, perfil);
    expect(entrada).toEqual({ acao: 'recusar', erro: 'conta-removida' });
  });

  it('não achou ninguém: sem conta', () => {
    expect(decidirEntrada(null, null, perfil)).toEqual({ acao: 'sem-conta' });
  });
});

describe('convite no state (card 05)', () => {
  const token = 'Abc_123-xyzXYZ0987654321abcdEFGH';

  it('ida e volta preservam o token do convite', () => {
    expect(lerState(montarState('n1', '/x', token))?.convite).toBe(token);
  });

  it('sem convite: undefined', () => {
    expect(lerState(montarState('n1', '/x'))?.convite).toBeUndefined();
  });

  it.each([
    ['../x'],
    ['curto'],
    ['a'.repeat(200)],
    ['com espaço aqui 1234'],
    [42],
  ])('descarta %p, que não tem a forma de um token', (entrada) => {
    expect(sanitizarConvite(entrada)).toBeUndefined();
  });
});
