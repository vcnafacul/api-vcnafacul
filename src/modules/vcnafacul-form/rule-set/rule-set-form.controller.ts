import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { RuleSetFormService } from './rule-set-form.service';

@ApiTags('RuleSet Form')
@Controller('rule-set-form')
export class RuleSetFormController {
  constructor(private readonly service: RuleSetFormService) {}

  @Post()
  @ApiResponse({
    status: 201,
    description: 'cria conjunto de regras',
  })
  public async createRuleSet(@Body() dto: unknown) {
    return await this.service.createRuleSet(dto);
  }

  @Post('ranking')
  @ApiResponse({
    status: 200,
    description: 'calcula ranking baseado no conjunto de regras',
  })
  public async ranking(@Body() dto: unknown) {
    return await this.service.ranking(dto);
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'busca todos os conjuntos de regras',
  })
  public async getRuleSets(@Query() query: GetAllDtoInput) {
    return await this.service.getRuleSets(query);
  }

  @Patch('add')
  @ApiResponse({
    status: 200,
    description: 'adiciona regra ao conjunto',
  })
  public async addRule(@Body() dto: unknown) {
    return await this.service.addRule(dto);
  }

  @Patch('remove')
  @ApiResponse({
    status: 200,
    description: 'remove regra do conjunto',
  })
  public async removeRule(@Body() dto: unknown) {
    return await this.service.removeRule(dto);
  }

  @Get('by-inscription/:inscriptionId')
  @ApiResponse({
    status: 200,
    description:
      'busca ou cria conjunto de regras vinculado ao processo seletivo',
  })
  public async getRuleSetByInscriptionId(
    @Param('inscriptionId') inscriptionId: string,
  ) {
    return await this.service.getRuleSetByInscriptionId(inscriptionId);
  }

  @Get(':id/last-ranking')
  @ApiResponse({
    status: 200,
    description: 'busca último ranking gerado do conjunto de regras',
  })
  public async getLastRanking(@Param('id') id: string) {
    return await this.service.getLastRanking(id);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'busca conjunto de regras por id',
  })
  public async getRuleSetById(@Param('id') id: string) {
    return await this.service.getRuleSetById(id);
  }

  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'atualiza conjunto de regras',
  })
  public async updateRuleSet(
    @Param('id') id: string,
    @Body() dto: unknown,
  ) {
    return await this.service.updateRuleSet(id, dto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'deleta conjunto de regras',
  })
  public async deleteRuleSet(@Param('id') id: string) {
    return await this.service.deleteRuleSet(id);
  }
}
