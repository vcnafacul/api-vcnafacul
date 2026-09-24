import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvService } from '../modules/env/env.service';
import { ehTokenDeEmail } from '../auth/token-de-email';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly envService: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envService.get('APP_KEY'),
    });
  }

  async validate(payload: any) {
    /*
      ⚠️ **Token de email não é login** (card 01 de `convite-de-colaborador`).
      Mesmo `APP_KEY`, mesmo `{ user: { id } }` — sem esta recusa, o link do
      convite ou da redefinição de senha autenticava qualquer rota.
    */
    if (ehTokenDeEmail(payload)) throw new UnauthorizedException();
    return { ...payload.user };
  }
}
