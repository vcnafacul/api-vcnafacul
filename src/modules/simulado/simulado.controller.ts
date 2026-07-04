import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/permissions/permissions';
import { User } from '../user/user.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { AnswerSimulado } from './dtos/answer-simulado.dto.input';
import { AvailableSimuladoDTOoutput } from './dtos/available-simulado.dto.output';
import { CreateSimuladoDTOInput } from './dtos/create-simulado.dto.input';
import { ReportDTO } from './dtos/report.dto.input';
import { SimuladoAnswerDTO } from './dtos/simulado-answer.dto.output';
import { SimuladoDTO } from './dtos/simulado.dto.output';
import { SimuladoService } from './simulado.service';

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
  async create(@Body() dto: CreateSimuladoDTOInput): Promise<SimuladoDTO> {
    return await this.simuladoService.create(dto);
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'busca todas os simulados',
    type: SimuladoDTO,
    isArray: true,
  })
  async getAdd(@Query() query: GetAllDtoInput): Promise<SimuladoDTO[]> {
    return await this.simuladoService.getAll(query.page, query.limit);
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
    status: 202,
    description: 'Simulado enfileirado para processamento assíncrono',
  })
  @UseGuards(JwtAuthGuard)
  public async answer(
    @Body() answer: AnswerSimulado,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.simuladoService.answer(
        answer,
        (req.user as User).id,
      );
      return res.status(202).json(result);
    } catch (error) {
      return res.status(error?.status || 502).json({
        message: error?.message || 'Erro ao enfileirar simulado',
      });
    }
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

  @Get('summary')
  async getSummary() {
    return await this.simuladoService.getSummary();
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Buscar Simulado por id',
    type: SimuladoDTO,
    isArray: false,
  })
  @UseGuards(JwtAuthGuard)
  public async getById(@Param('id') id: string): Promise<SimuladoDTO> {
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
