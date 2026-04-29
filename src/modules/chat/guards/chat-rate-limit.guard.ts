import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { CacheService } from 'src/shared/modules/cache/cache.service';

const MINUTE_LIMIT = 10;
const BURST_LIMIT = 3;
const MINUTE_TTL_MS = 60_000;
const BURST_TTL_MS = 5_000;

/**
 * Token-bucket-ish rate limiter usando CacheService (Redis em produção).
 * Limites: 10 msgs/min + 3 msgs/5s, por `user.id` autenticado.
 *
 * Tradeoff: TTL é "renovado" a cada incremento bem-sucedido (sliding window
 * aproximado). Quando bloqueado, NÃO incrementa — janela expira normalmente,
 * sem estender lockout indefinidamente. Solução precisa (fixed window com
 * INCR/EXPIRE NX) requer acesso raw ao Redis; deferida pra Fase 2 do
 * Trust Score (ver spec).
 */
@Injectable()
export class ChatRateLimitGuard implements CanActivate {
  constructor(private readonly cache: CacheService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    if (!userId) {
      throw new ThrottlerException('Usuário não autenticado');
    }

    const minuteKey = `chat:rl:min:${userId}`;
    const burstKey = `chat:rl:burst:${userId}`;

    // Checa antes de incrementar — requisições bloqueadas NÃO tocam o cache,
    // evitando que spammers estendam o lockout indefinidamente.
    const minuteCount = (await this.cache.get<number>(minuteKey)) ?? 0;
    if (minuteCount >= MINUTE_LIMIT) {
      throw new HttpException(
        {
          message: `Limite de ${MINUTE_LIMIT} mensagens por minuto`,
          retryAfterSeconds: Math.ceil(MINUTE_TTL_MS / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const burstCount = (await this.cache.get<number>(burstKey)) ?? 0;
    if (burstCount >= BURST_LIMIT) {
      throw new HttpException(
        {
          message: 'Aguarde alguns segundos antes de enviar',
          retryAfterSeconds: Math.ceil(BURST_TTL_MS / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Só incrementa se passou nos dois limites.
    await this.cache.set(minuteKey, minuteCount + 1, MINUTE_TTL_MS);
    await this.cache.set(burstKey, burstCount + 1, BURST_TTL_MS);

    return true;
  }
}
