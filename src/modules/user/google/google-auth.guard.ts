import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard, IAuthModuleOptions } from '@nestjs/passport';
import { Request, Response } from 'express';
import {
  COOKIE_DO_STATE,
  VALIDADE_DO_STATE_MS,
  gerarNonce,
  lerState,
  montarState,
  sanitizarVoltar,
} from './google-auth.regras';

/**
 * Ida ao Google: grava o `nonce` num cookie e manda o `state`.
 *
 * ⚠️ **`sameSite: 'lax'`, não `strict`** como o do refresh: a volta do Google é
 * uma navegação vinda de outro site, e com `strict` o navegador não mandaria o
 * cookie no callback — todo login daria "state inválido".
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const nonce = gerarNonce();
    res.cookie(COOKIE_DO_STATE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: VALIDADE_DO_STATE_MS,
    });
    return {
      state: montarState(nonce, sanitizarVoltar(req.query.voltar)),
    } as IAuthModuleOptions;
  }
}

/**
 * Volta do Google: confere o `state` com o cookie **antes** de trocar o `code`,
 * e nunca lança — quem desistiu na tela do Google, `state` errado ou falha na
 * troca viram `req.user = null`, e o controller manda para o login com erro
 * (em vez de um JSON 401 na cara da pessoa).
 */
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const nonce = req.cookies?.[COOKIE_DO_STATE];
    res.clearCookie(COOKIE_DO_STATE);

    const state = lerState(req.query.state);
    if (!state || !nonce || state.nonce !== nonce) {
      req.user = null;
      return true;
    }
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      req.user = null;
      return true;
    }
  }

  handleRequest<TUser>(err: unknown, user: TUser): TUser | null {
    if (err || !user) return null;
    return user;
  }
}
