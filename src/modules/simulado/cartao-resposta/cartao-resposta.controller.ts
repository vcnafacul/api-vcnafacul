import {
  Controller,
  Get,
  Param,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CartaoRespostaHttpService } from './cartao-resposta-http.service';

@ApiTags('Simulado - Cartão Resposta')
@Controller('mssimulado/cartao-resposta')
export class CartaoRespostaController {
  constructor(private readonly service: CartaoRespostaHttpService) {}

  @Get(':simuladoId')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'baixa o PDF do cartão de resposta',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvas)
  async baixarCartao(
    @Param('simuladoId') simuladoId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType } = await this.service.baixarCartao(simuladoId);
    res.setHeader('Content-Type', contentType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="cartao-${simuladoId}.pdf"`,
    );
    res.send(buffer);
  }
}
