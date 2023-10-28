import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
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
import { Status } from './enum/status.enum';
import { UpdateDTOInput } from './dtos/update-questao.dto.input';

@ApiTags('Simulado')
@Controller('simulado')
export class SimuladoController {
  constructor(private readonly simuladoService: SimuladoService) {}

  @Post()
  @ApiResponse({
    status: 200,
    description: 'materias cadastradas e validas',
    type: SimuladoDTO,
    isArray: false,
  })
  async create(
    @Body() dto: CreateSimuladoDTOInput,
  ): Promise<Observable<SimuladoDTO>> {
    return await this.simuladoService.create(dto);
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'materias cadastradas e validas',
    type: SimuladoDTO,
    isArray: true,
  })
  async gelAdd(): Promise<Observable<SimuladoDTO[]>> {
    return await this.simuladoService.getAll();
  }

  @Get('toanswer/:id')
  @ApiResponse({
    status: 200,
    description: 'materias cadastradas e validas',
    type: SimuladoAnswerDTO,
    isArray: false,
  })
  public async getToAnswer(@Param('id') id: string) {
    return await this.simuladoService.getToAnswer(id);
  }

  @Post('answer')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async answer(@Body() answer: AnswerSimulado, @Req() req: Request) {
    answer.idEstudante = (req.user as User).id;
    return await this.simuladoService.answer(answer);
  }

  @Get('default')
  @ApiResponse({
    status: 200,
    description: 'materias cadastradas e validas',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  public async getDefaults() {
    return await this.simuladoService.getDefaults();
  }

  @Get('questoes/infos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async questoesInfo() {
    return await this.simuladoService.questoesInfo();
  }

  @Get('questoes/:status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async questoes(@Param('status') status: Status) {
    return await this.simuladoService.questoes(status);
  }

  @Patch('questoes/:id/:status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async questoesUpdateStatus(
    @Param('id') id: string,
    @Param('status') status: Status,
  ) {
    return await this.simuladoService.questoesUpdateStatus(id, status);
  }

  @Patch('questoes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async questoesUpdate(@Body() question: UpdateDTOInput) {
    return await this.simuladoService.questoesUpdate(question);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'materias cadastradas e validas',
    type: SimuladoDTO,
    isArray: false,
  })
  public async getById(
    @Param('id') id: string,
  ): Promise<Observable<SimuladoDTO>> {
    return await this.simuladoService.getById(id);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    await this.simuladoService.delete(id);
  }

  @Post('report')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async report(@Body() reportDto: ReportDTO, @Req() req: Request) {
    return await this.simuladoService.report(reportDto, (req.user as User).id);
  }
}
