import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtStrategy } from '../strategy/jwt.strategy';
import { PermissionsGuard } from '../guards/permission.guard';
import { PropositoDoToken, TokenDeEmailGuard } from './token-de-email';

/**
 * Tokens mandados por email NÃO são credencial de login (card 01 de
 * `convite-de-colaborador`).
 *
 * ⚠️ Todos eram assinados com o mesmo `APP_KEY` e o mesmo formato
 * `{ user: { id } }` do login, e o `JwtStrategy` aceitava qualquer um: quem
 * tivesse o link do convite (7 dias), da confirmação de email ou da
 * redefinição de senha chamava QUALQUER rota como aquele usuário.
 */
const SEGREDO = 'segredo-de-teste';
const env = { get: jest.fn().mockReturnValue(SEGREDO) } as any;

const login = jwt.sign({ user: { id: 'u1' }, roles: [] }, SEGREDO);
const doEmail = (typ: PropositoDoToken) =>
  jwt.sign({ user: { id: 'u1' }, typ }, SEGREDO);

const contexto = (token?: string) => {
  const request: any = {
    headers: { authorization: token ? `Bearer ${token}` : undefined },
  };
  return {
    request,
    ctx: {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any,
  };
};

describe('JwtStrategy — recusa token de email', () => {
  const strategy = new JwtStrategy(env);

  it('token de login continua valendo', async () => {
    await expect(strategy.validate({ user: { id: 'u1' } })).resolves.toEqual({
      id: 'u1',
    });
  });

  it.each(Object.values(PropositoDoToken))(
    '⚠️ token de %s NÃO autentica',
    async (typ) => {
      await expect(
        strategy.validate({ user: { id: 'u1' }, typ }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );
});

describe('PermissionsGuard — recusa token de email', () => {
  it('⚠️ o link do convite não passa numa rota com permissão', async () => {
    /*
      O guard busca a permissão NO BANCO pelo `user.id` — um token de email
      de alguém com permissão passaria. Tem de ser recusado antes.
    */
    const userService = {
      checkUserPermission: jest.fn().mockResolvedValue(true),
    };
    const reflector = { get: jest.fn().mockReturnValue('alterar_permissao') };
    const guard = new PermissionsGuard(
      reflector as any,
      userService as any,
      env,
    );

    const { ctx } = contexto(doEmail(PropositoDoToken.convite));

    await expect(guard.canActivate(ctx)).resolves.toBe(false);
    expect(userService.checkUserPermission).not.toHaveBeenCalled();
  });

  it('token de login continua passando', async () => {
    const userService = {
      checkUserPermission: jest.fn().mockResolvedValue(true),
    };
    const reflector = { get: jest.fn().mockReturnValue('alterar_permissao') };
    const guard = new PermissionsGuard(
      reflector as any,
      userService as any,
      env,
    );

    await expect(guard.canActivate(contexto(login).ctx)).resolves.toBe(true);
  });
});

describe('TokenDeEmailGuard — cada rota aceita só o próprio propósito', () => {
  const Guard = TokenDeEmailGuard(PropositoDoToken.redefinirSenha);
  const guard = new Guard(env);

  it('token do propósito certo passa e preenche req.user', () => {
    const { ctx, request } = contexto(doEmail(PropositoDoToken.redefinirSenha));

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual({ id: 'u1' });
  });

  it('⚠️ token de OUTRO propósito é recusado', () => {
    // O link do convite não redefine a senha de ninguém.
    const { ctx } = contexto(doEmail(PropositoDoToken.convite));

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('⚠️ token de LOGIN também é recusado — não é token de email', () => {
    expect(() => guard.canActivate(contexto(login).ctx)).toThrow(
      UnauthorizedException,
    );
  });

  it('sem token, ou assinatura errada: recusa', () => {
    expect(() => guard.canActivate(contexto().ctx)).toThrow(
      UnauthorizedException,
    );
    const falso = jwt.sign(
      { user: { id: 'u1' }, typ: PropositoDoToken.redefinirSenha },
      'outro-segredo',
    );
    expect(() => guard.canActivate(contexto(falso).ctx)).toThrow(
      UnauthorizedException,
    );
  });

  it('token expirado: recusa', () => {
    const vencido = jwt.sign(
      { user: { id: 'u1' }, typ: PropositoDoToken.redefinirSenha },
      SEGREDO,
      { expiresIn: -10 },
    );
    expect(() => guard.canActivate(contexto(vencido).ctx)).toThrow(
      UnauthorizedException,
    );
  });
});
