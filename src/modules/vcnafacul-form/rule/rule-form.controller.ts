import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { RuleFormService } from './rule-form.service';

@ApiTags('Rule Form')
@Controller('rule-form')
export class RuleFormController {
  constructor(private readonly service: RuleFormService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'busca todas as regras',
  })
  public async getRules(@Query() query: GetAllDtoInput) {
    return await this.service.getRules(query);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'busca regra por id',
  })
  public async getRuleById(@Param('id') id: string) {
    return await this.service.getRuleById(id);
  }

  @Post()
  @ApiResponse({
    status: 201,
    description: 'cria regra de pontuação',
  })
  public async createRule(@Body() dto: unknown) {
    try {
      return await this.service.createRule(dto);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Put(':id')
  @ApiResponse({
    status: 200,
    description: 'atualiza regra',
  })
  public async updateRule(@Param('id') id: string, @Body() dto: unknown) {
    return await this.service.updateRule(id, dto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'deleta regra',
  })
  public async deleteRule(@Param('id') id: string) {
    return await this.service.deleteRule(id);
  }
}
