import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { ExameProxyService } from './exame.service';

/**
 * ⚠️ **Só leitura, e sem permissão específica.** A lista de exames é um
 * catálogo pequeno e público entre usuários autenticados — quem monta uma
 * categoria precisa dela para escolher o exame, e sem isso um cursinho novo
 * não consegue criar a primeira categoria.
 */
@ApiTags('Simulado - Exame')
@Controller('mssimulado/exame')
export class ExameProxyController {
  constructor(private readonly exameService: ExameProxyService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'lista os exames' })
  async getAll() {
    return await this.exameService.getAll();
  }
}
