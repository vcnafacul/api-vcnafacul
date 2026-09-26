import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  mixin,
  Type,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { EnvService } from '../modules/env/env.service';

/**
 * Para que serve um token mandado por email (card 01 de
 * `convite-de-colaborador`).
 *
 * ⚠️ **Todo token que não é de login carrega um `typ`**, e é o que o separa
 * do login: o `JwtStrategy` e o `PermissionsGuard` recusam token com `typ`, e
 * cada rota que consome um deles exige o seu (`TokenDeEmailGuard`).
 *
 * Antes, todos eram assinados com o mesmo `APP_KEY` e o mesmo `{ user: { id } }`
 * do login — quem tivesse o link (email encaminhado, print) chamava qualquer
 * rota como aquele usuário, por até 7 dias no caso do convite.
 */
export enum PropositoDoToken {
  /*
    ⚠️ Sem `convite`: o convite de colaborador deixou de ser JWT (card 03 —
    token opaco, só o hash no banco), e o convite antigo saiu no card 06.
  */
  confirmarEmail = 'confirmar-email',
  redefinirSenha = 'redefinir-senha',
  /*
    Não vai por email, mas é o mesmo problema: o cadastro pelo Google (card
    02 de `login-com-google`) guarda os dados do Google num JWT até o 2º passo,
    e sem `typ` ele passaria por login.
  */
  cadastroGoogle = 'cadastro-google',
}

/** O token é de email (tem propósito)? — o de login não tem `typ`. */
export function ehTokenDeEmail(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as { typ?: unknown }).typ === 'string'
  );
}

/**
 * Guard das rotas que consomem um token de email: aceita **só** o propósito
 * dela — nem o de login, nem o de outro propósito.
 *
 * ⚠️ Preenche `req.user` como o `JwtAuthGuard` fazia, para os controllers não
 * mudarem.
 */
export function TokenDeEmailGuard(
  proposito: PropositoDoToken,
): Type<CanActivate> {
  @Injectable()
  class Guard implements CanActivate {
    constructor(private readonly envService: EnvService) {}

    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const header: string | undefined = request.headers?.authorization;
      if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();

      let payload: jwt.JwtPayload;
      try {
        payload = jwt.verify(
          header.slice(7),
          this.envService.get('APP_KEY'),
        ) as jwt.JwtPayload;
      } catch {
        throw new UnauthorizedException();
      }
      if (payload.typ !== proposito || !payload.user?.id) {
        throw new UnauthorizedException();
      }
      request.user = payload.user;
      return true;
    }
  }
  return mixin(Guard);
}
