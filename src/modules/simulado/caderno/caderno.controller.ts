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

  /**
   * ⚠️ **O param e RESTRITO a 24 hex no proprio path, e e ISSO que impede a
   * colisao** com as rotas literais de `mssimulado/caderno/template/*` do
   * `CadernoTemplateController`. Sem a restricao, `:simuladoId` casa com
   * qualquer segmento -- inclusive o literal `template` -- e engole
   * `GET mssimulado/caderno/template` (a versao publicada do layout), que
   * morre com 400 do `ObjectIdPipe`. Medido: a rota ficava INALCANCAVEL.
   *
   * ⚠️ Por causa disto, a ordem dos controllers no `simulado.module.ts` **nao
   * importa**. Depender dela funcionava, mas era acoplamento invisivel: nada
   * aqui diria "eu preciso vir depois", e uma ordenacao alfabetica desfaria
   * isso em silencio.
   *
   * ⚠️ O `ObjectIdPipe` FICA. O regex resolve o roteamento; o pipe e a
   * validacao, e sobrevive caso alguem mexa neste decorador um dia.
   *
   * ⚠️ Custo aceito: um id malformado legitimo recebe 404 em vez de 400 --
   * nao casa rota nenhuma. O cliente so manda ids reais de uma lista, entao e
   * raro, e o pedido e recusado igual. Ver o teste `404: simuladoId que sairia
   * do caminho nem chega a casar rota`.
   */
  @Get(':simuladoId([0-9a-fA-F]{24})')
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
