import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { ChatRateLimitGuard } from './chat-rate-limit.guard';

/**
 * NOTA: Babel + plugin-proposal-decorators (legacy) não suporta parameter
 * decorators. Em vez de usar `Test.createTestingModule` (que dependeria do
 * `@Inject` resolver), instanciamos a guard direto passando o mock.
 * A lógica testada (chave minuteKey/burstKey + thresholds) é a mesma; o
 * importante é cobrir o comportamento, não o pipeline de DI.
 */

describe('ChatRateLimitGuard', () => {
  let guard: ChatRateLimitGuard;
  const store = new Map<string, number>();
  const mockCache = {
    get: jest.fn((k: string) => Promise.resolve(store.get(k))),
    set: jest.fn((k: string, v: number) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    del: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
  };

  const ctx = (userId = 'u1'): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: userId } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
    guard = new ChatRateLimitGuard(mockCache as unknown as CacheService);
  });

  it('rejects when no user is authenticated', async () => {
    const anonCtx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(anonCtx)).rejects.toThrow(
      ThrottlerException,
    );
  });

  it('allows the first 3 messages then rejects the 4th (burst)', async () => {
    for (let i = 0; i < 3; i++) {
      await expect(guard.canActivate(ctx())).resolves.toBe(true);
    }
    await expect(guard.canActivate(ctx())).rejects.toThrow(HttpException);
  });

  it('isolates limits per user', async () => {
    for (let i = 0; i < 3; i++) await guard.canActivate(ctx('u1'));
    // u2 starts fresh
    await expect(guard.canActivate(ctx('u2'))).resolves.toBe(true);
  });

  it('blocked request does NOT increment counter (no lockout extension)', async () => {
    // 3 hits válidos = burst no limite
    for (let i = 0; i < 3; i++) await guard.canActivate(ctx());
    expect(store.get('chat:rl:burst:u1')).toBe(3);

    // 4ª request bloqueada NÃO deve mexer no counter
    await expect(guard.canActivate(ctx())).rejects.toThrow(HttpException);
    expect(store.get('chat:rl:burst:u1')).toBe(3);

    // 5ª também bloqueada, counter continua 3 — janela pode expirar normalmente
    await expect(guard.canActivate(ctx())).rejects.toThrow(HttpException);
    expect(store.get('chat:rl:burst:u1')).toBe(3);
  });

  it('rejection uses HttpException 429 with retryAfterSeconds payload (burst)', async () => {
    for (let i = 0; i < 3; i++) await guard.canActivate(ctx());
    try {
      await guard.canActivate(ctx());
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const e = err as HttpException;
      expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      const resp = e.getResponse() as {
        message: string;
        retryAfterSeconds: number;
      };
      expect(resp.message).toMatch(/segundos/i);
      expect(resp.retryAfterSeconds).toBe(5);
    }
  });

  it('rejection uses HttpException 429 with retryAfterSeconds payload (minute)', async () => {
    // Pré-popula o counter de minuto pra atingir o limite sem disparar burst
    store.set('chat:rl:min:u1', 10);
    try {
      await guard.canActivate(ctx());
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const e = err as HttpException;
      expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      const resp = e.getResponse() as {
        message: string;
        retryAfterSeconds: number;
      };
      expect(resp.message).toMatch(/minuto/i);
      expect(resp.retryAfterSeconds).toBe(60);
    }
  });
});
