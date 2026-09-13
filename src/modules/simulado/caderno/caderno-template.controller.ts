import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CadernoTemplateHttpService } from './caderno-template-http.service';

/** 5 MB — o mesmo teto do ms. Ver o comentário no `subirRascunho`. */
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

/**
 * Os oito endpoints de template do caderno, expostos pela api.
 *
 * Proxy 1:1 do ms-simulado: nenhuma regra de negócio nova mora aqui. O que
 * mora são três coisas que só a api pode fazer — o `criadorId` tirado do JWT,
 * a auditoria das duas ações destrutivas, e a interpretação dos query params
 * do `/teste`, que o serviço se recusa a receber como texto.
 *
 * ⚠️ **`JwtAuthGuard` junto do `PermissionsGuard` em todas as rotas.** O
 * `PermissionsGuard` verifica o JWT, mas devolve `false` quando não há token —
 * e o Nest traduz `false` para **403**, não 401. Sem os dois, "sem token" e
 * "sem permissão" viram a mesma resposta, e quem está com a sessão expirada
 * não é mandado para o login. É o mesmo comentário do `caderno.controller.ts`
 * do card 05, ao lado.
 *
 * ⚠️ **A permissão é `alterarPermissao` nas oito.** Editar o layout da prova
 * impressa é ação de coordenação, e o repo já usa essa coluna para esse nível.
 * Nenhuma permissão nova, nenhuma migration.
 */
@ApiTags('Simulado - Caderno')
@Controller('mssimulado/caderno/template')
export class CadernoTemplateController {
  constructor(
    private readonly service: CadernoTemplateHttpService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'a versão publicada do template' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async publicada() {
    return this.service.publicada();
  }

  @Get('rascunho')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'o rascunho em edição' })
  @ApiResponse({ status: 404, description: 'não há rascunho' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async getRascunho() {
    return this.service.rascunho();
  }

  @Get('versoes')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'o histórico de versões' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async versoes() {
    return this.service.versoes();
  }

  /**
   * O zip modelo, para o coordenador subir no Overleaf.
   *
   * ⚠️ **A validação dos query params é repetida de propósito.** O ms já
   * valida, mas quem monta a rota interna é a api: se ela repassasse o texto
   * recebido sem interpretar, `?rascunho=xis` viraria o literal `?rascunho=1`
   * em silêncio e o 400 do ms **nunca dispararia** — a api jamais enviaria o
   * valor estranho. Ver `interpretarTeste`.
   */
  @Get('teste')
  @ApiBearerAuth()
  @ApiQuery({ name: 'versao', required: false, type: Number })
  @ApiQuery({ name: 'rascunho', required: false, enum: ['1', 'true'] })
  @ApiResponse({ status: 200, description: 'baixa o zip modelo do template' })
  @ApiResponse({ status: 400, description: 'query inválida' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async zipDeTeste(
    @Query('versao') versao: string | undefined,
    @Query('rascunho') rascunho: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType } = await this.service.zipDeTeste(
      this.interpretarTeste(versao, rascunho),
    );

    res.setHeader('Content-Type', contentType || 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="caderno-template-teste.zip"',
    );
    res.send(buffer);
  }

  /**
   * Sobe o zip que o coordenador baixou do Overleaf, como rascunho.
   *
   * ⚠️ **O limite do `FileInterceptor` é a trava que importa.** O body parser
   * global de 30 MB é grande demais para proteger e nem se aplica a
   * multipart; o limite do ms é a última linha, do outro lado da rede.
   *
   * ⚠️ `criadorId` sai do JWT, nunca do corpo. O ms o exige como campo
   * interno.
   */
  @Post('rascunho')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['arquivo'],
      properties: {
        arquivo: { type: 'string', format: 'binary' },
        notas: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'rascunho criado' })
  @ApiResponse({ status: 400, description: 'zip ausente ou inválido' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: TAMANHO_MAXIMO } }),
  )
  async subirRascunho(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body() corpo: { notas?: string },
    @Req() req: Request,
  ) {
    if (!arquivo) {
      throw new BadRequestException('arquivo é obrigatório');
    }

    return this.service.subirRascunho(
      arquivo,
      (req.user as User).id,
      corpo?.notas,
    );
  }

  @Delete('rascunho')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'rascunho descartado' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async descartarRascunho() {
    return this.service.descartarRascunho();
  }

  /**
   * Publica o rascunho.
   *
   * ⚠️ **O audit grava DEPOIS do `await`.** Um log de "publicou a v5" para uma
   * publicação que o ms recusou com 409 é pior que log nenhum: manda procurar
   * uma versão que não existe.
   */
  @Post('rascunho/publicar')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'rascunho publicado' })
  @ApiResponse({ status: 409, description: 'não há rascunho publicável' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async publicar(@Req() req: Request) {
    const publicada = await this.service.publicar<{ versao: number }>();

    await this.auditLog.create({
      entityType: 'caderno-template',
      entityId: String(publicada.versao),
      updatedBy: (req.user as User).id,
      changes: { acao: 'publicar', versao: publicada.versao },
    });

    return publicada;
  }

  /**
   * Restaura uma versão anterior, criando um rascunho a partir dela.
   *
   * ⚠️ **Sem `notas`, e é decisão.** O ms descarta o campo de propósito — quem
   * escreve a nota de um rascunho restaurado é ele mesmo ("Restaurado da
   * versão N"). Aceitar o campo aqui daria ao coordenador um texto que some
   * sem erro.
   *
   * ⚠️ O audit grava DEPOIS do `await`, com a versão de ORIGEM: é o que o
   * coordenador escolheu, e o número do rascunho novo quem decide é o ms.
   */
  @Post('versoes/:versao/restaurar')
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'rascunho criado a partir da versão',
  })
  @ApiResponse({ status: 404, description: 'versão inexistente' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async restaurar(
    @Param('versao', ParseIntPipe) versao: number,
    @Req() req: Request,
  ): Promise<void> {
    const criadorId = (req.user as User).id;

    await this.service.restaurar<void>(versao, criadorId);

    await this.auditLog.create({
      entityType: 'caderno-template',
      entityId: String(versao),
      updatedBy: criadorId,
      changes: { acao: 'restaurar', versao },
    });
  }

  /**
   * A tabela da spec, em código:
   *
   * | entrada | resultado |
   * |---|---|
   * | nada | `{}` |
   * | `?versao=` inteiro positivo | `{ versao: n }` |
   * | `?rascunho=1` ou `?rascunho=true` | `{ rascunho: true }` |
   * | `?rascunho=` outro valor | `BadRequestException` |
   * | `?versao=` não inteiro positivo | `BadRequestException` |
   * | os dois | `BadRequestException` |
   */
  private interpretarTeste(
    versao: string | undefined,
    rascunho: string | undefined,
  ): { versao?: number; rascunho?: boolean } {
    if (versao !== undefined && rascunho !== undefined) {
      throw new BadRequestException(
        'informe `versao` ou `rascunho`, nunca os dois',
      );
    }

    if (rascunho !== undefined) {
      if (rascunho !== '1' && rascunho !== 'true') {
        throw new BadRequestException('`rascunho` só aceita `1` ou `true`');
      }
      return { rascunho: true };
    }

    if (versao !== undefined) {
      if (!/^\d+$/.test(versao) || Number(versao) < 1) {
        throw new BadRequestException('`versao` deve ser um inteiro positivo');
      }
      return { versao: Number(versao) };
    }

    return {};
  }
}
