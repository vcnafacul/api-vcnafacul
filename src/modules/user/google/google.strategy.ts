import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { EnvService } from 'src/shared/modules/env/env.service';
import { PerfilGoogle } from './google-auth.regras';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(envService: EnvService) {
    /*
      ⚠️ **`|| 'dev-disabled'` e não só o default do zod**: `GOOGLE_CLIENT_ID=`
      vazio no `.env` chega como `''` (o default só cobre ausente), e o
      passport lança no construtor — a api inteira não sobe por causa do login
      com Google.
    */
    super({
      clientID: envService.get('GOOGLE_CLIENT_ID') || 'dev-disabled',
      clientSecret: envService.get('GOOGLE_CLIENT_SECRET') || 'dev-disabled',
      callbackURL: envService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<PerfilGoogle> {
    const email = profile.emails?.[0];
    if (!email?.value) {
      throw new UnauthorizedException('Conta Google sem email');
    }
    /*
      ⚠️ Email não verificado não prova nada: entrar por ele vincularia a
      conta de quem digitou aquele email no Google, sem ser o dono.
    */
    if (email.verified === false) {
      throw new UnauthorizedException('Email Google não verificado');
    }
    return {
      googleId: profile.id,
      email: email.value.trim().toLowerCase(),
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
    };
  }
}
