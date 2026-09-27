import { BadRequestException } from '@nestjs/common';
import { emLotes, linkDoSite, validarPayload } from './push.regras';

const FRONT = 'https://vcnafacul.com.br';

describe('validarPayload', () => {
  const ok = { title: 'Aviso', body: 'Corpo' };

  it('aceita título e corpo dentro dos limites', () => {
    expect(() => validarPayload(ok, FRONT)).not.toThrow();
  });

  it.each([
    ['título vazio', { ...ok, title: '  ' }],
    ['título com 101', { ...ok, title: 'x'.repeat(101) }],
    ['corpo vazio', { ...ok, body: '' }],
    ['corpo com 501', { ...ok, body: 'x'.repeat(501) }],
  ])('recusa %s com 400', (_, payload) => {
    expect(() => validarPayload(payload, FRONT)).toThrow(BadRequestException);
  });

  it('⚠️ recusa link externo com 400', () => {
    expect(() =>
      validarPayload({ ...ok, url: 'https://golpe.example/login' }, FRONT),
    ).toThrow(BadRequestException);
  });
});

describe('linkDoSite', () => {
  it.each(['/simulados', '/', `${FRONT}/perfil`])('aceita %s', (url) => {
    expect(linkDoSite(url, FRONT)).toBe(true);
  });

  it.each([
    'https://golpe.example',
    '//golpe.example/x',
    '/\\golpe.example',
    'javascript:alert(1)',
    'https://vcnafacul.com.br.golpe.example/',
    'http://vcnafacul.com.br/',
  ])('⚠️ recusa %s', (url) => {
    expect(linkDoSite(url, FRONT)).toBe(false);
  });
});

describe('emLotes', () => {
  it('1.234 itens → 500/500/234', () => {
    const lotes = emLotes(Array.from({ length: 1234 }, (_, i) => i));
    expect(lotes.map((l) => l.length)).toEqual([500, 500, 234]);
  });
});
