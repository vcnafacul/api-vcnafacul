import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE_CONFIG } from 'src/shared/config/email.config';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
import { CadastroPeloGoogleDtoInput } from './cadastro-pelo-google.dto.input';
import {
  COOKIE_DO_CADASTRO,
  VALIDADE_DO_CADASTRO_MS,
} from './cadastro-pendente';

const OPCOES_DO_COOKIE_DO_CADASTRO = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: VALIDADE_DO_CADASTRO_MS,
};

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
    const voltar = lerState(req.query.state)?.voltar ?? DESTINO_PADRAO;

    // Sem conta: 2º passo (card 02) — a conta só nasce lá
    if ('erro' in resultado && resultado.erro === 'sem-conta') {
      res.cookie(
        COOKIE_DO_CADASTRO,
        await this.service.tokenDeCadastro(perfil, voltar),
        OPCOES_DO_COOKIE_DO_CADASTRO,
      );
      return res.redirect(`${front}/cadastro/google`);
    }
    if ('erro' in resultado) return erro(resultado.erro);

    res.cookie(
      'refresh_token',
      resultado.sessao.refresh_token,
      OPCOES_DO_COOKIE_DE_REFRESH,
    );
    return res.redirect(
      `${front}/auth/google?voltar=${encodeURIComponent(voltar)}`,
    );
  }

  /** Os dados do Google para o 2º passo — email travado e nome sugerido. */
  @Get('cadastro')
  @ApiResponse({ status: 401, description: 'sem cadastro pendente ou vencido' })
  async cadastroPendente(@Req() req: Request) {
    return this.service.cadastroPendente(req.cookies?.[COOKIE_DO_CADASTRO]);
  }

  /**
   * O 2º passo: cria a conta e sai logada. O refresh vai no cookie, como no
   * login; o `voltar` é para onde o front leva a pessoa.
   */
  @Post('cadastro')
  @Throttle({
    default: {
      ttl: THROTTLE_CONFIG.CREATE_USER.ttl,
      limit: THROTTLE_CONFIG.CREATE_USER.limit,
    },
  })
  @ApiResponse({ status: 201, description: 'conta criada e logada' })
  async cadastrar(
    @Req() req: Request,
    @Body() dto: CadastroPeloGoogleDtoInput,
    @Res() res: Response,
  ) {
    const { sessao, voltar } = await this.service.cadastrar(
      req.cookies?.[COOKIE_DO_CADASTRO],
      dto,
    );
    res.clearCookie(COOKIE_DO_CADASTRO);
    res.cookie(
      'refresh_token',
      sessao.refresh_token,
      OPCOES_DO_COOKIE_DE_REFRESH,
    );
    return res.status(201).json({
      access_token: sessao.access_token,
      expires_in: sessao.expires_in,
      voltar,
    });
  }
}
