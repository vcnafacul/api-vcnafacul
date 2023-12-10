import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SimuladoService } from './simulado.service';
import { CreateSimuladoDTOInput } from './dtos/create-simulado.dto.input';
import { SimuladoDTO } from './dtos/simulado.dto.output';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SimuladoAnswerDTO } from './dtos/simulado-answer.dto.output';
import { AnswerSimulado } from './dtos/answer-simulado.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { User } from '../user/user.entity';
import { ReportDTO } from './dtos/report.dto.input';
import { Status } from './enum/status.enum';
import { UpdateDTOInput } from './dtos/update-questao.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { CreateQuestaoDTOInput } from './dtos/create-questao.dto.input';
import multerConfig from 'src/config/multer-config';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Simulado')
@Controller('simulado')
export class SimuladoController {
  constructor(private readonly simuladoService: SimuladoService) {}

  @Post()
  @ApiResponse({
    status: 200,
    description: 'cria simulado',
    type: SimuladoDTO,
    isArray: false,
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarSimulado)
  async create(
    @Body() dto: CreateSimuladoDTOInput,
  ): Promise<Observable<SimuladoDTO>> {
    return await this.simuladoService.create(dto);
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'busca todas os simulados',
    type: SimuladoDTO,
    isArray: true,
  })
  async getAdd(): Promise<Observable<SimuladoDTO[]>> {
    return await this.simuladoService.getAll();
  }

  @Get('toanswer/:id')
  @ApiResponse({
    status: 200,
    description: 'busca simulado pronto para responder por Id',
    type: SimuladoAnswerDTO,
    isArray: false,
  })
  @UseGuards(JwtAuthGuard)
  public async getToAnswer(@Param('id') id: string) {
    return await this.simuladoService.getToAnswer(id);
  }

  @Post('answer')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'endpoint para responder simulado',
    type: SimuladoAnswerDTO,
    isArray: false,
  })
  @UseGuards(JwtAuthGuard)
  public async answer(@Body() answer: AnswerSimulado, @Req() req: Request) {
    answer.idEstudante = (req.user as User).id;
    return await this.simuladoService.answer(answer);
  }

  @Get('default')
  @ApiResponse({
    status: 200,
    description: 'busca simulados default disponível para responder',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  public async getDefaults() {
    return await this.simuladoService.getDefaults();
  }

  @Get('questoes/infos')
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
    return await this.simuladoService.questoesInfo();
  }

  @Get('questoes/:status')
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
  public async questoes(@Param('status') status: Status) {
    return await this.simuladoService.questoes(status);
  }

  @Patch('questoes/:id/:status')
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
    return await this.simuladoService.questoesUpdateStatus(id, status);
  }

  @Patch('questoes')
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
    return await this.simuladoService.questoesUpdate(question);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Buscar Simulado por id',
    type: SimuladoDTO,
    isArray: false,
  })
  @UseGuards(JwtAuthGuard)
  public async getById(
    @Param('id') id: string,
  ): Promise<Observable<SimuladoDTO>> {
    return await this.simuladoService.getById(id);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @ApiResponse({
    status: 200,
    description: 'deleta simulado por id',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @SetMetadata(PermissionsGuard.name, Permissions.criarSimulado)
  public async delete(@Param('id') id: string): Promise<void> {
    await this.simuladoService.delete(id);
  }

  @Post('report')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'endopint para report de problemas de simulado',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  public async report(@Body() reportDto: ReportDTO, @Req() req: Request) {
    return await this.simuladoService.report(reportDto, (req.user as User).id);
  }

  @Post('questoes')
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
    return await this.simuladoService.createQuestion(dto);
  }

  @Post('questoes/uploadimage')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'upload de nova imagem de questao',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  public async uploadImage(@UploadedFile() file, @Res() res: Response) {
    return res
      .status(HttpStatus.CREATED)
      .send(await this.simuladoService.uploadImage(file));
  }
}
