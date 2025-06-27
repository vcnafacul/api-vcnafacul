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
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CreateQuestaoDTOInput } from '../dtos/create-questao.dto.input';
import { QuestaoDTOInput } from '../dtos/questao.dto.input';
import { UpdateStatusDTOInput } from '../dtos/update-questao-status.dto.input';
import { UpdateDTOInput } from '../dtos/update-questao.dto.input';
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
  public async questoesUpdate(@Body() question: UpdateDTOInput) {
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'files', maxCount: 10 },
      { name: 'imageId', maxCount: 1 },
      { name: 'altA', maxCount: 1 },
      { name: 'altB', maxCount: 1 },
      { name: 'altC', maxCount: 1 },
      { name: 'altD', maxCount: 1 },
      { name: 'altE', maxCount: 1 },
    ]),
  )
  public async createQuestion(
    @UploadedFile()
    files: {
      files?: Express.Multer.File[];
      imageId?: Express.Multer.File;
      altA?: Express.Multer.File;
      altB?: Express.Multer.File;
      altC?: Express.Multer.File;
      altD?: Express.Multer.File;
      altE?: Express.Multer.File;
    },
    @Req() req: Request,
  ) {
    return await this.questaoService.createQuestion(
      req.body as CreateQuestaoDTOInput,
      files.files || [],
      files.imageId?.[0] || null,
      files.altA?.[0] || null,
      files.altB?.[0] || null,
      files.altC?.[0] || null,
      files.altD?.[0] || null,
      files.altE?.[0] || null,
    );
  }

  @Patch('uploadimage')
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
  public async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return await this.questaoService.uploadImage(file);
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
