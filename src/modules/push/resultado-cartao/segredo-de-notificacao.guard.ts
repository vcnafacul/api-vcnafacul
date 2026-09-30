import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { EnvService } from 'src/shared/modules/env/env.service';

export const HEADER_SEGREDO = 'x-notificacao-secret';

/**
 * Rota interna chamada pelo ms-simulado (tickets/028). Sem JWT: o que
 * autoriza é o segredo compartilhado. ⚠️ Segredo vazio na api = recusa tudo
 * (nunca "aberto por omissão"). Comparação em tempo constante.
 */
@Injectable()
export class SegredoDeNotificacaoGuard implements CanActivate {
  constructor(private readonly env: EnvService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const esperado = this.env.get('NOTIFICACAO_SECRET') ?? '';
    const recebido = ctx.switchToHttp().getRequest().headers?.[HEADER_SEGREDO];
    if (!esperado || typeof recebido !== 'string') return false;
    const a = Buffer.from(esperado);
    const b = Buffer.from(recebido);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
