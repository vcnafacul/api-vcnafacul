// src/modules/simulado/categoria/categoria.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriaDTO } from '../dtos/categoria.dto.output';
import { SimuladoService } from '../simulado.service';

@ApiTags('Simulado - Categoria')
@Controller('mssimulado/categoria')
export class CategoriaProxyController {
  constructor(private readonly simuladoService: SimuladoService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'busca todas as categorias de simulado',
    type: CategoriaDTO,
    isArray: true,
  })
  async getCategorias(): Promise<CategoriaDTO[]> {
    return await this.simuladoService.getCategorias();
  }
}
