import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ObjectIdPipe } from 'src/shared/pipes/object-id.pipe';
import { CadernoHttpService } from './caderno-http.service';

@ApiTags('Simulado - Caderno')
@Controller('mssimulado/caderno')
export class CadernoController {
  constructor(private readonly service: CadernoHttpService) {}

  @Get(':simuladoId')
  @ApiBearerAuth()
  @ApiQuery({ name: 'draft', required: false, enum: ['true'] })
  @ApiResponse({ status: 200, description: 'baixa o zip do caderno (LaTeX)' })
  @ApiResponse({ status: 409, description: 'simulado não está pronto' })
  // ⚠️ `JwtAuthGuard` junto, diferente do `baixarCartao`. O `PermissionsGuard`
  // verifica o JWT, mas devolve `false` quando não há token — e o Nest
  // traduz `false` para 403, não 401. Os outros endpoints do controller do
  // cartão já usam os dois; o `baixarCartao` é que é a exceção.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvas)
  async baixar(
    @Param('simuladoId', ObjectIdPipe) simuladoId: string,
    @Query('draft') draft: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType, avisos } = await this.service.baixar(
      simuladoId,
      draft === 'true',
    );

    res.setHeader('Content-Type', contentType || 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="caderno-${simuladoId}.zip"`,
    );
    if (avisos !== undefined) res.setHeader('X-Caderno-Avisos', avisos);

    res.send(buffer);
  }
}
