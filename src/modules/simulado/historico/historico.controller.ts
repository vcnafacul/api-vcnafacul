import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { GetHistoricoDTOInput } from '../dtos/get-historico.dto';
import { HistoricoService } from './historico.service';

@ApiTags('Historico')
@Controller('mssimulado/historico')
export class HistoricoController {
  constructor(private readonly service: HistoricoService) {}

  @Get()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'obtém todos os históricos de simulados',
  })
  @UseGuards(JwtAuthGuard)
  async getAllByUser(
    @Query() query: GetHistoricoDTOInput,
    @Req() req: Request,
  ) {
    return await this.service.getAllByUser(query, (req.user as User).id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'obtém histórico detalhado por ID',
  })
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string) {
    return await this.service.getById(id);
  }
}
