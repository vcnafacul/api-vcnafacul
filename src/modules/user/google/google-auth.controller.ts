import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { EnvService } from 'src/shared/modules/env/env.service';
import { OPCOES_DO_COOKIE_DE_REFRESH } from '../cookie-de-refresh';
import {
  DESTINO_PADRAO,
  ErroDoGoogle,
  PerfilGoogle,
  lerState,
} from './google-auth.regras';
import { GoogleAuthGuard, GoogleCallbackGuard } from './google-auth.guard';
import { GoogleAuthService } from './google-auth.service';

@ApiTags('User')
@Controller('user/auth/google')
export class GoogleAuthController {
  constructor(
    private readonly service: GoogleAuthService,
    private readonly envService: EnvService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Leva ao Google para entrar. `?voltar=/caminho` — para onde ir depois',
  })
  @UseGuards(GoogleAuthGuard)
  // O guard redireciona ao Google; o corpo nunca roda
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  iniciar() {}

  /**
   * Volta do Google.
   *
   * ⚠️ **Nenhum token na URL**: o refresh vai no cookie httpOnly, e o front
   * troca por um access token chamando `POST /user/refresh`. Token em query
   * string vaza em log de servidor, histórico e `Referer`.
   */
  @Get('callback')
  @ApiExcludeEndpoint()
  @UseGuards(GoogleCallbackGuard)
  async callback(@Req() req: Request, @Res() res: Response) {
    const front = this.envService.get('FRONT_URL');
    const erro = (codigo: ErroDoGoogle) =>
      res.redirect(`${front}/login?erro=${codigo}`);

    const perfil = req.user as PerfilGoogle | null;
    if (!perfil) return erro('google');

    let resultado: Awaited<ReturnType<GoogleAuthService['entrar']>>;
    try {
      resultado = await this.service.entrar(perfil);
    } catch {
      return erro('google');
    }
    if ('erro' in resultado) return erro(resultado.erro);

    res.cookie(
      'refresh_token',
      resultado.sessao.refresh_token,
      OPCOES_DO_COOKIE_DE_REFRESH,
    );
    const voltar = lerState(req.query.state)?.voltar ?? DESTINO_PADRAO;
    return res.redirect(
      `${front}/auth/google?voltar=${encodeURIComponent(voltar)}`,
    );
  }
}
