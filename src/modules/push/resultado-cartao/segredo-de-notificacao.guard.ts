import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
    /*
      ⚠️ 401, e não o 403 do `false` (tickets/042, card 14): segredo errado é
      falha de AUTENTICAÇÃO do serviço chamador. O ms só registra o status.
    */
    const ok =
      !!esperado &&
      typeof recebido === 'string' &&
      Buffer.from(esperado).length === Buffer.from(recebido).length &&
      timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
    if (!ok) throw new UnauthorizedException('segredo de notificação inválido');
    return true;
  }
}
