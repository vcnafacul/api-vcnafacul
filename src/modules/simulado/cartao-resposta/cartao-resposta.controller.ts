import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CartaoRespostaHttpService } from './cartao-resposta-http.service';
import { CartaoRespostaResultadosService } from './cartao-resposta-resultados.service';
import { CartaoReprocessoService } from './cartao-reprocesso.service';
import { CartaoUploadService } from './cartao-upload.service';

/**
 * ⚠️ 8 MB. A rota de upload que já existe **não tem limite nenhum** — o
 * `FileInterceptor('file')` de lá não recebe `limits`, e o `json({ limit })`
 * global não vale para multipart. Esta nasce com limite; a antiga fica
 * registrada no card como pendência.
 */
const TAMANHO_MAXIMO_CARTAO = 8 * 1024 * 1024;

@ApiTags('Simulado - Cartão Resposta')
@Controller('mssimulado/cartao-resposta')
export class CartaoRespostaController {
  constructor(
    private readonly service: CartaoRespostaHttpService,
    private readonly resultadosService: CartaoRespostaResultadosService,
    private readonly uploadService: CartaoUploadService,
    private readonly reprocessoService: CartaoReprocessoService,
  ) {}

  /**
   * Reenvia a foto (ou só pede nova tentativa) de um cartão que falhou.
   *
   * ⚠️ `gerenciarEstudantes`, e não o `visualizarEstudantes` da rota de upload
   * vizinha: a ação nasce no relatório e muda estado. A inconsistência com o
   * upload fica **registrada e não é consertada aqui** — mudar permissão de
   * rota em produção escondida num PR de feature é o que esta série recusou.
   */
  @Post(':historicoId/reprocessar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: TAMANHO_MAXIMO_CARTAO } }),
  )
  @ApiBearerAuth()
  @ApiResponse({ status: 202, description: 'reprocessamento aceito' })
  @ApiResponse({
    status: 400,
    description: 'a foto é de outro cartão ou de outro simulado',
  })
  @ApiResponse({
    status: 409,
    description: 'cartão não está com falha, ou tentativa cedo demais',
  })
  async reprocessar(
    @Param('historicoId') historicoId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<void> {
    return this.reprocessoService.processar(
      (req.user as User).id,
      historicoId,
      file,
    );
  }

  @Post('upload')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'upload do cartão preenchido' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarEstudantes)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('usuario') usuario: string,
    @Req() req: Request,
  ) {
    return this.uploadService.processar((req.user as User).id, usuario, file);
  }

  @Get('resultados')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'resultados do aluno por matrícula (escopo cursinho)',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarEstudantes)
  async resultadosPorMatricula(
    @Query('matricula') matricula: string,
    @Req() req: Request,
  ) {
    return this.resultadosService.buscarPorMatricula(
      (req.user as User).id,
      matricula,
    );
  }

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
