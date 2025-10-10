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
import { SectionFormService } from './section-form.service';

@ApiTags('Section Form')
@Controller('section-form')
export class SectionFormController {
  constructor(private readonly service: SectionFormService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'busca todas as seções do formulário',
  })
  public async getSectionForm(@Query() query: GetAllDtoInput) {
    return await this.service.getSectionForm(query);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'busca seção do formulário por id',
  })
  public async getSectionFormById(@Param('id') id: string) {
    return await this.service.getSectionFormById(id);
  }

  @Post()
  @ApiResponse({
    status: 200,
    description: 'cria seção do formulário',
  })
  public async createSectionForm(@Body() dto: { name: string }) {
    return await this.service.createSectionForm(dto);
  }

  @Patch(':id/set-active')
  @ApiResponse({
    status: 200,
    description: 'ativa seção do formulário',
  })
  public async setActiveSectionForm(@Param('id') id: string) {
    return await this.service.setActiveSectionForm(id);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'deleta seção do formulário',
  })
  public async deleteSectionForm(@Param('id') id: string) {
    await this.service.deleteSectionForm(id);
  }

  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'atualiza seção do formulário',
  })
  public async updateSectionForm(
    @Param('id') id: string,
    @Body() dto: { name: string },
  ) {
    await this.service.updateSectionForm(id, dto);
  }
}
