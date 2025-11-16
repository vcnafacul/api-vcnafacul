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
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { QuestaoDTOInput } from '../dtos/questao.dto.input';
import { UpdateImageAlternativaDTOInput } from '../dtos/update-image-alternativa.dto.input';
import { UpdateStatusDTOInput } from '../dtos/update-questao-status.dto.input';
import { Status } from '../enum/status.enum';
import { QuestaoService } from './questao.service';

@ApiTags('Questao')
@Controller('mssimulado/questoes')
export class QuestaoController {
  constructor(private readonly questaoService: QuestaoService) {}

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
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarQuestao)
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
    Permissions.visualizarQuestao,
    Permissions.cadastrarProvas,
  ])
  public async questoesInfo() {
    return await this.questaoService.questoesInfo();
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
  // @UseGuards(PermissionsGuard)
  // @SetMetadata(PermissionsGuard.name, Permissions.visualizarQuestao)
  public async getById(@Param('id') id: string) {
    return await this.questaoService.getById(id);
  }

  @Patch(':id/classification')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza classificação de questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  public async updateClassificacao(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return await this.questaoService.updateClassificacao(id, body);
  }

  @Patch(':id/content')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza conteúdo de questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  public async updateContent(@Param('id') id: string, @Body() body: unknown) {
    return await this.questaoService.updateContent(id, body);
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
  ])
  @UseInterceptors(FileInterceptor('file'))
  public async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.questaoService.uploadImage(id, file);
  }

  @Patch(':id/:status')
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
  @SetMetadata(PermissionsGuard.name, Permissions.validarQuestao)
  public async questoesUpdateStatus(
    @Param('id') id: string,
    @Param('status') status: Status,
    @Body() body: UpdateStatusDTOInput,
    @Req() req: Request,
  ) {
    return await this.questaoService.questoesUpdateStatus(
      id,
      status,
      req.user as User,
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
  public async questoesUpdate(@Body() question: unknown) {
    return await this.questaoService.questoesUpdate(question);
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
  ])
  public async createQuestion(@Body() questao: unknown) {
    return await this.questaoService.createQuestion(questao);
  }

  @Get(':id/image')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca imagem de questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarQuestao)
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
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarQuestao)
  public async getLogs(@Param('id') id: string) {
    return await this.questaoService.getLogs(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'deleta questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarQuestao)
  public async delete(@Param('id') id: string) {
    return await this.questaoService.delete(id);
  }

  @Get('history/:id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca histórico de questão',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarQuestao)
  public async history(@Param('id') id: string) {
    return await this.questaoService.getHistory(id);
  }

  @Get('summary')
  async getSummary() {
    return await this.questaoService.getSummary();
  }
}
