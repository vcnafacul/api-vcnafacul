import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { EnvService } from 'src/shared/modules/env/env.service';

export interface GoogleUser {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(envService: EnvService) {
    super({
      clientID: envService.get('GOOGLE_CLIENT_ID'),
      clientSecret: envService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: envService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<GoogleUser> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('Google profile sem email');
    }
    if (profile.emails[0].verified === false) {
      throw new UnauthorizedException('Email Google não verificado');
    }
    return {
      googleId: profile.id,
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
