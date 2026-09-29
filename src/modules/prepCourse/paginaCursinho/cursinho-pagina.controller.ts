import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { LinksInternosService } from './links-internos.service';
import { PaginaPublicaService } from './pagina-publica.service';

/**
 * Página pública do cursinho (tickets/025). Sem guard: o throttle global vale.
 */
@ApiTags('Página do cursinho')
@Controller('cursinho-pagina')
export class CursinhoPaginaController {
  constructor(
    private readonly publica: PaginaPublicaService,
    private readonly internos: LinksInternosService,
  ) {}

  @Get(':slug')
  @ApiResponse({
    status: 200,
    description:
      'página pública do cursinho; 404 se não existe ou está desativada',
  })
  async porSlug(@Param('slug') slug: string) {
    return await this.publica.porSlug(slug);
  }

  /**
   * ⚠️ Rota separada da pública (card 05): a resposta depende de quem pede,
   * então não pode entrar no cache da página.
   */
  @Get(':slug/links-internos')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description:
      'links internos — só colaborador ativo ou aluno matriculado do cursinho',
  })
  @UseGuards(JwtAuthGuard)
  async linksInternos(@Param('slug') slug: string, @Req() req: Request) {
    return await this.internos.doSlug(slug, (req.user as User).id);
  }
}
