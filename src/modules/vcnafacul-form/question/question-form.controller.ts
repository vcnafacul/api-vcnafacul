import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { CreateQuestionDtoInput } from './dtos/create-question.dto.input';
import { QuestionFormService } from './question-form.service';

@ApiTags('Question Form')
@Controller('question-form')
export class QuestionFormController {
  constructor(private readonly service: QuestionFormService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'busca todas as seções do formulário',
  })
  public async getQuestionForm(query: GetAllDtoInput) {
    return await this.service.getQuestionForm(query);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'busca seção do formulário por id',
  })
  public async getQuestionFormById(@Param('id') id: string) {
    return await this.service.getQuestionFormById(id);
  }

  @Post()
  @ApiResponse({
    status: 200,
    description: 'cria seção do formulário',
  })
  public async createQuestionForm(@Body() dto: CreateQuestionDtoInput) {
    return await this.service.createQuestionForm(dto);
  }

  @Patch(':id/set-active')
  @ApiResponse({
    status: 200,
    description: 'ativa seção do formulário',
  })
  public async setActiveQuestionForm(@Param('id') id: string) {
    await this.service.setActiveQuestionForm(id);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'deleta seção do formulário',
  })
  public async deleteQuestionForm(@Param('id') id: string) {
    await this.service.deleteQuestionForm(id);
  }

  @Put(':id')
  @ApiResponse({
    status: 200,
    description: 'atualiza seção do formulário',
  })
  public async updateQuestionForm(
    @Param('id') id: string,
    @Body() dto: unknown,
  ) {
    await this.service.updateQuestionForm(id, dto);
  }
}
