import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { QuestaoDTOInput } from '../dtos/questao.dto.input';
import { UpdateImageAlternativaDTOInput } from '../dtos/update-image-alternativa.dto.input';
import { UpdateStatusDTOInput } from '../dtos/update-questao-status.dto.input';
import { Status } from '../enum/status.enum';
import { AtorService } from '../ator/ator.service';
import { QuestaoService } from './questao.service';

/**
 * Quem vê o banco de questões: o projeto e o cursinho (tickets/023, card 01).
 * `editarQuestoesCursinho` implica a de ver ao salvar o papel, e entra aqui
 * também para não depender disso.
 */
const VER_QUESTOES = [
  Permissions.visualizarQuestao,
  Permissions.visualizarQuestoesCursinho,
  Permissions.editarQuestoesCursinho,
];

@ApiTags('Questao')
@Controller('mssimulado/questoes')
export class QuestaoController {
  constructor(
    private readonly questaoService: QuestaoService,
    private readonly atorService: AtorService,
  ) {}

  /** Quem está agindo, do JWT (tickets/023, card 02). */
  private ator(req: Request) {
    return this.atorService.resolver((req.user as User).id);
  }

  @Get()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca questões por status',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, VER_QUESTOES)
  public async questoes(@Query() query: QuestaoDTOInput) {
    return await this.questaoService.getAllQuestoes(query);
  }

  @Get('infos')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description:
      'busca informações de exame, materias e frentes referente a questões',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    ...VER_QUESTOES,
    Permissions.cadastrarProvas,
  ])
  public async questoesInfo(@Req() req: Request) {
    return await this.questaoService.questoesInfo(await this.ator(req));
  }

  // ⚠️ `summary` fica ANTES do `@Get(':id')`, e a ordem é significativa: no
  // Express a primeira rota que casa vence, então com o `:id` em cima
  // `GET /mssimulado/questoes/summary` caía no `getById()` com `id =
  // "summary"` e o proxy repassava isso ao ms como id de questão. O endpoint
  // existe e funciona no ms — inalcançável era só esta camada. O client o
  // chama na home pública, pelo `impactStats.ts`.
  //
  // Guardado por `questao-rotas.controller.spec.ts`, que monta um app de
  // verdade: chamar o método direto nunca alcança a colisão.
  @Get('summary')
  async getSummary() {
    return await this.questaoService.getSummary();
  }

  // getbyId
  @Get(':id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca questão por id',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  /*
    ⚠️ tickets/023, card 16: estava SEM guard (comentado) — qualquer pessoa,
    mesmo sem login, lia a questão inteira, com gabarito e as provas em que
    ela está. Agora exige ver o banco (projeto ou cursinho).
  */
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, VER_QUESTOES)
  public async getById(@Param('id') id: string, @Req() req: Request) {
    return await this.questaoService.getById(id, await this.ator(req));
  }

  @Post('assets')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'upload de asset inline para rich text',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  @UseInterceptors(FileInterceptor('file'))
  public async uploadAsset(@UploadedFile() file: Express.Multer.File) {
    return await this.questaoService.uploadAsset(file);
  }

  @Patch(':id/classification')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza classificação de questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  public async updateClassificacao(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return await this.questaoService.updateClassificacao(
      id,
      body,
      await this.ator(req),
    );
  }

  @Patch(':id/content')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza conteúdo de questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  public async updateContent(@Param('id') id: string, @Body() body: unknown) {
    return await this.questaoService.updateContent(id, body);
  }

  /**
   * ⚠️ **Faltava na api** (QA): o client chamava `PATCH :id/nova-versao` e caía
   * no `:id/:status` abaixo, com `status = "nova-versao"` — o ms respondia
   * `Cast to Number failed for value "NaN"`. Salvar como nova versão nunca
   * funcionou por aqui.
   *
   * `criarQuestao`, a mesma permissão de editar o conteúdo: versionar é editar
   * o conteúdo guardando a original.
   */
  @Patch(':id/nova-versao')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description:
      'congela a questão e cria a sucessora já editada; as provas passam a usar a nova',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  public async novaVersao(
    @Param('id') id: string,
    @Body() body: object,
    @Req() req: Request,
  ) {
    return await this.questaoService.novaVersao(id, body, req.user as User);
  }

  @Patch(':id/image-alternativa')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza imagem de alternativa da questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.validarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  @UseInterceptors(FileInterceptor('file'))
  public async updateImageAlternativa(
    @Param('id') id: string,
    @Body() body: UpdateImageAlternativaDTOInput,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.questaoService.updateImageAlternativa(
      id,
      file,
      body.alternativa,
    );
  }

  @Patch(':id/uploadimage')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'upload de nova imagem de questao',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.validarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  @UseInterceptors(FileInterceptor('file'))
  public async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.questaoService.uploadImage(id, file);
  }

  /**
   * ⚠️ **`criarQuestao`, e NÃO `validarQuestao`.** Duplicar produz uma questão
   * nova — quem pode criar pode duplicar. Um validador que só aprova/rejeita
   * não deveria poder encher o banco de cópias.
   */
  @Post(':id/duplicar')
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'cria uma cópia editável da questão, com lastro',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  public async duplicar(@Param('id') id: string, @Req() req: Request) {
    return await this.questaoService.duplicar(id, req.user as User);
  }

  /**
   * ⚠️ **`visualizarQuestao`**: ver a linhagem é leitura, e quem abre o banco
   * de questões precisa ver versões e cópias sem poder criar nada.
   */
  @Get(':id/linhagem')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'a cadeia de versões, as cópias diretas e a origem',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, VER_QUESTOES)
  public async linhagem(@Param('id') id: string) {
    return await this.questaoService.linhagem(id);
  }

  @Post(':id/provas')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'adiciona questão a uma prova' })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.validarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  public async adicionarEmProva(
    @Param('id') id: string,
    @Body() body: { provaId: string; numero: number },
    @Req() req: Request,
  ) {
    return await this.questaoService.adicionarEmProva(
      id,
      body,
      await this.ator(req),
    );
  }

  @Delete(':id/provas/:provaId')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'remove questão de uma prova' })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.validarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  public async removerDeProva(
    @Param('id') id: string,
    @Param('provaId') provaId: string,
    @Req() req: Request,
  ) {
    return await this.questaoService.removerDeProva(
      id,
      provaId,
      await this.ator(req),
    );
  }

  @Patch(':id/prova-base')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'define a provaBase da questão' })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.validarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  public async definirProvaBase(
    @Param('id') id: string,
    @Body() body: { provaId: string },
    @Req() req: Request,
  ) {
    return await this.questaoService.definirProvaBase(
      id,
      body,
      req.user as User,
    );
  }

  /**
   * ⚠️ **`:status` só casa com número** (o `Status` é 0, 1 ou 2). Sem isso,
   * qualquer `PATCH :id/<literal>` que a api não declare cai aqui e vira
   * `Cast to Number ... "NaN"` no ms — foi como a falta da `nova-versao` se
   * escondeu. Agora um literal desconhecido é 404 na api.
   */
  @Patch(':id/:status(\\d+)')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza status de questão',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  // tickets/024, card 02: o validador do cursinho também — a regra é do ms.
  @SetMetadata(PermissionsGuard.name, [
    Permissions.validarQuestao,
    Permissions.validarQuestoesCursinho,
  ])
  public async questoesUpdateStatus(
    @Param('id') id: string,
    @Param('status') status: Status,
    @Body() body: UpdateStatusDTOInput,
    @Req() req: Request,
  ) {
    return await this.questaoService.questoesUpdateStatus(
      id,
      status,
      await this.ator(req),
      body.message,
    );
  }

  @Patch()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza informações de questão',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarQuestao)
  public async questoesUpdate(@Body() question: unknown, @Req() req: Request) {
    return await this.questaoService.questoesUpdate(
      question,
      await this.ator(req),
    );
  }

  @Post()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'criar questão',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.criarQuestao,
    Permissions.validarQuestao,
    Permissions.editarQuestoesCursinho,
  ])
  public async createQuestion(@Body() questao: unknown, @Req() req: Request) {
    return await this.questaoService.createQuestion(
      questao,
      await this.ator(req),
    );
  }

  @Get(':id/image')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca imagem de questão',
  })
  // Recurso consumido por alunos durante o simulado: exige apenas autenticação
  @UseGuards(JwtAuthGuard)
  public async getImage(@Param('id') id: string) {
    return await this.questaoService.getImage(id);
  }

  @Get('health/s3-test')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'testa conexão com S3 e cache',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarQuestao)
  public async testS3Connection() {
    return await this.questaoService.testS3Connection();
  }

  @Delete(':id/cache')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'limpa cache da imagem de uma questão específica',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarQuestao)
  public async clearImageCache(@Param('id') id: string) {
    return await this.questaoService.clearImageCache(id);
  }

  @Get(':id/logs')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca logs de questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, VER_QUESTOES)
  public async getLogs(@Param('id') id: string) {
    return await this.questaoService.getLogs(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'exclui (soft) uma questão órfã',
  })
  @ApiResponse({
    status: 409,
    description: 'não pode ser excluída — o corpo lista os motivos',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.excluirQuestao)
  public async delete(@Param('id') id: string, @Req() req: Request) {
    return await this.questaoService.delete(id, req.user as User);
  }

  /**
   * ⚠️ **`excluirQuestao`, a mesma guarda do `DELETE`.** Quem não pode excluir
   * não tem por que perguntar se pode — e o client só pergunta para decidir se
   * mostra o botão.
   */
  @Get(':id/exclusao')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'se a questão pode ser excluída, e os motivos se não',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.excluirQuestao)
  public async podeExcluir(@Param('id') id: string) {
    return await this.questaoService.podeExcluir(id);
  }

  @Get('history/:id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca histórico de questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, VER_QUESTOES)
  public async history(@Param('id') id: string) {
    return await this.questaoService.getHistory(id);
  }
}
