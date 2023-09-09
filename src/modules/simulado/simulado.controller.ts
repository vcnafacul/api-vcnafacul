import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { SimuladoService } from './simulado.service';
import { CreateSimuladoDTOInput } from './dtos/create-simulado.dto.input';
import { SimuladoDTO } from './dtos/simulado.dto.output';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SimuladoAnswerDTO } from './dtos/simulado-answer.dto.output';

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
}
