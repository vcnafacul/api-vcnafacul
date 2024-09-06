import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
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
import multerConfig from 'src/config/multer-config';
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
}
