import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { SimuladoService } from './simulado.service';
import { CreateSimuladoDTOInput } from './dtos/create-simulado.dto.input';
import { SimuladoDTO } from './dtos/simulado.dto.output';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SimuladoAnswerDTO } from './dtos/simulado-answer.dto.output';
import { AnswerSimulado } from './dtos/answer-simulado.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Request } from 'express';
import { User } from '../user/user.entity';
import { ReportDTO } from './dtos/report.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { TipoSimuladoDTO } from './dtos/tipo-simulado.dto.output';
import { AvailableSimuladoDTOoutput } from './dtos/available-simulado.dto.output';

@ApiTags('Simulado')
@Controller('mssimulado/simulado')
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

  @Get('tipos')
  @ApiResponse({
    status: 200,
    description: 'busca todos os tipos de simulados',
    type: SimuladoDTO,
    isArray: true,
  })
  async getTipos(): Promise<Observable<TipoSimuladoDTO[]>> {
    return await this.simuladoService.getTipos();
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

  @Get('available')
  @ApiResponse({
    status: 200,
    description: 'Buscar Simulado disponíveis por tipo',
    type: AvailableSimuladoDTOoutput,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard)
  public async getAvailable(@Query('tipo') type: string) {
    return await this.simuladoService.getAvailable(type);
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
}
