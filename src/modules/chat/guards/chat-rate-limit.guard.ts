import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { CacheService } from 'src/shared/modules/cache/cache.service';

const MINUTE_LIMIT = 10;
const BURST_LIMIT = 3;
const MINUTE_TTL_MS = 60_000;
const BURST_TTL_MS = 5_000;

/**
 * Token-bucket simples baseado em CacheService (Redis em produção).
 * Limita 10 mensagens por minuto e 3 mensagens por janela de 5s
 * por `user.id` autenticado.
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

    const minuteCount = ((await this.cache.get<number>(minuteKey)) ?? 0) + 1;
    await this.cache.set(minuteKey, minuteCount, MINUTE_TTL_MS);
    if (minuteCount > MINUTE_LIMIT) {
      throw new ThrottlerException('Limite de 10 mensagens por minuto');
    }

    const burstCount = ((await this.cache.get<number>(burstKey)) ?? 0) + 1;
    await this.cache.set(burstKey, burstCount, BURST_TTL_MS);
    if (burstCount > BURST_LIMIT) {
      throw new ThrottlerException('Aguarde alguns segundos antes de enviar');
    }

    return true;
  }
}
