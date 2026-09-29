import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginaPublicaService } from './pagina-publica.service';

/**
 * Página pública do cursinho (tickets/025). Sem guard: o throttle global vale.
 */
@ApiTags('Página do cursinho')
@Controller('cursinho-pagina')
export class CursinhoPaginaController {
  constructor(private readonly publica: PaginaPublicaService) {}

  @Get(':slug')
  @ApiResponse({
    status: 200,
    description:
      'página pública do cursinho; 404 se não existe ou está desativada',
  })
  async porSlug(@Param('slug') slug: string) {
    return await this.publica.porSlug(slug);
  }
}
