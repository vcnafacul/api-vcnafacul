import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { CartaoImagemService } from './cartao-imagem.service';
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
    private readonly imagemService: CartaoImagemService,
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
  /**
   * ⚠️ **202 explícito.** Sem ele o Nest devolve 201 para POST, e o
   * `@ApiResponse` abaixo passaria a documentar um código que a rota não
   * emite — um contrato que mente. E 202 é o certo: o OMR é acionado aqui,
   * mas a leitura só volta pelo callback.
   */
  @HttpCode(202)
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

  /**
   * Baixa a foto do cartão enviado — o botão do modal do estudante no
   * relatório do simulado.
   *
   * ⚠️ `gerenciarEstudantes`, a permissão do relatório onde o botão mora: quem
   * vê o detalhe pode baixar a foto dele. O recorte por cursinho sai do JWT.
   *
   * ⚠️ Dois segmentos: não colide com o `GET :simuladoId` abaixo.
   */
  @Get(':historicoId/imagem')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'a foto do cartão enviado' })
  @ApiResponse({
    status: 404,
    description: 'histórico de outro cursinho, ou sem foto',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async baixarImagem(
    @Param('historicoId') historicoId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType, nomeDoArquivo } =
      await this.imagemService.baixar((req.user as User).id, historicoId);
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomeDoArquivo}"`,
    );
    res.send(buffer);
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

  /**
   * Autocomplete do envio de cartão: estudantes do cursinho por matrícula ou
   * nome.
   *
   * ⚠️ **Declarada ANTES de `@Get(':simuladoId')`**, como a `resultados` ao
   * lado. O Nest casa rotas na ordem de declaração: depois do param, `buscar`
   * seria capturado como um `simuladoId` e a rota nunca executaria. É a classe
   * de defeito que nenhum teste de unidade pega, porque nasce no roteamento.
   *
   * ⚠️ `visualizarEstudantes`, a mesma permissão da `resultados`: quem pode ver
   * o estudante pode procurá-lo. O recorte por cursinho sai do JWT no serviço.
   */
  @Get('buscar-estudantes')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'estudantes do cursinho por matrícula ou nome (autocomplete)',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarEstudantes)
  async buscarEstudantes(@Query('termo') termo: string, @Req() req: Request) {
    return this.resultadosService.buscarEstudantes(
      (req.user as User).id,
      termo,
    );
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
