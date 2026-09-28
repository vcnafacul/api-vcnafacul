import { GeoController, THROTTLE_CONFIRMACAO } from './geo.controller';

// O throttler é desligado nos e2e: o limite é conferido na metadata.
const limiteDe = (h: (...a: never[]) => unknown) => ({
  limit: Reflect.getMetadata('THROTTLER:LIMITdefault', h),
  ttl: Reflect.getMetadata('THROTTLER:TTLdefault', h),
});

describe('GeoController — limites da confirmação (tickets/022, card 03)', () => {
  it('confirmar e desfazer: 30 por minuto', () => {
    expect(THROTTLE_CONFIRMACAO.default).toEqual({ ttl: 60000, limit: 30 });
    for (const h of [
      GeoController.prototype.confirmar,
      GeoController.prototype.desfazer,
    ]) {
      expect(limiteDe(h)).toEqual({ limit: 30, ttl: 60000 });
    }
  });
});
