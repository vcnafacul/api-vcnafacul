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
import { CartaoUploadService } from './cartao-upload.service';

@ApiTags('Simulado - Cartão Resposta')
@Controller('mssimulado/cartao-resposta')
export class CartaoRespostaController {
  constructor(
    private readonly service: CartaoRespostaHttpService,
    private readonly resultadosService: CartaoRespostaResultadosService,
    private readonly uploadService: CartaoUploadService,
  ) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'upload do cartão preenchido' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarEstudantes)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('usuario') usuario: string,
  ) {
    return this.uploadService.processar(usuario, file);
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
