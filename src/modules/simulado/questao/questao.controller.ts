import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuestaoService } from './questao.service';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from 'src/modules/role/role.entity';
import { Status } from '../enum/status.enum';
import { CreateQuestaoDTOInput } from '../dtos/create-questao.dto.input';
import { FileInterceptor } from '@nestjs/platform-express';
import multerConfig from 'src/config/multer-config';
import { Response } from 'express';
import { UpdateDTOInput } from '../dtos/update-questao.dto.input';

@ApiTags('Questao')
@Controller('mssimulado/questoes')
export class QuestaoController {
  constructor(private readonly questaoService: QuestaoService) {}

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
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarQuestao)
  public async questoesInfo() {
    return await this.questaoService.questoesInfo();
  }

  @Get(':status')
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
  public async questoes(@Param('status') status: Status, @Query() query: any) {
    return await this.questaoService.getAllQuestoes(
      query.page,
      query.limit,
      status,
    );
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
  ) {
    return await this.questaoService.questoesUpdateStatus(id, status);
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
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  public async createQuestion(@Body() dto: CreateQuestaoDTOInput) {
    return await this.questaoService.createQuestion(dto);
  }

  @Post('uploadimage')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'upload de nova imagem de questao',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  public async uploadImage(@UploadedFile() file, @Res() res: Response) {
    return res
      .status(HttpStatus.CREATED)
      .send(await this.questaoService.uploadImage(file));
  }
}
