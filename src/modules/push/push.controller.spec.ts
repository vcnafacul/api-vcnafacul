import {
  PushController,
  THROTTLE_REMOVER,
  THROTTLE_TESTE,
} from './push.controller';

/*
  O throttler é desligado nos e2e (`app.module`, `isTestEnv`), então o limite
  é conferido aqui, na metadata que o `@Throttle` grava no handler.
*/
const limiteDe = (handler: (...args: never[]) => unknown) => ({
  limit: Reflect.getMetadata('THROTTLER:LIMITdefault', handler),
  ttl: Reflect.getMetadata('THROTTLER:TTLdefault', handler),
});

describe('PushController — limites de requisição', () => {
  it('POST /push/test: 5 por minuto', () => {
    expect(limiteDe(PushController.prototype.teste)).toEqual({
      limit: THROTTLE_TESTE.default.limit,
      ttl: THROTTLE_TESTE.default.ttl,
    });
    expect(THROTTLE_TESTE.default).toEqual({ ttl: 60000, limit: 5 });
  });

  it('DELETE /push/devices (público): com limite próprio', () => {
    expect(limiteDe(PushController.prototype.remover)).toEqual({
      limit: THROTTLE_REMOVER.default.limit,
      ttl: THROTTLE_REMOVER.default.ttl,
    });
  });
});
