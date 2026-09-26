import { CookieOptions } from 'express';

/** As mesmas opções do `POST /user/login` para o cookie `refresh_token`. */
export const OPCOES_DO_COOKIE_DE_REFRESH: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
