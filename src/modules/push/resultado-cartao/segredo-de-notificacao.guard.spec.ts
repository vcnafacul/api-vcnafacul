import { UnauthorizedException } from '@nestjs/common';
import { SegredoDeNotificacaoGuard } from './segredo-de-notificacao.guard';

describe('SegredoDeNotificacaoGuard (028 · 02)', () => {
  const ctx = (headers: Record<string, unknown>) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as never;
  const guard = (segredo: string) =>
    new SegredoDeNotificacaoGuard({ get: () => segredo } as never);

  it('segredo certo passa', () => {
    expect(
      guard('abc123').canActivate(ctx({ 'x-notificacao-secret': 'abc123' })),
    ).toBe(true);
  });

  it.each([
    ['errado', { 'x-notificacao-secret': 'abc124' }],
    ['tamanho diferente', { 'x-notificacao-secret': 'abc' }],
    ['ausente', {}],
    ['não-string', { 'x-notificacao-secret': ['abc123'] }],
  ])('%s → recusa com 401 (tickets/042)', (_n, headers) => {
    expect(() => guard('abc123').canActivate(ctx(headers))).toThrow(
      UnauthorizedException,
    );
  });

  it('⚠️ segredo vazio na api recusa tudo (nunca aberto por omissão)', () => {
    expect(() =>
      guard('').canActivate(ctx({ 'x-notificacao-secret': '' })),
    ).toThrow(UnauthorizedException);
  });
});
