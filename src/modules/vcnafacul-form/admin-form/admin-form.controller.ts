import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/modules/role/role.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { AdminFormService } from './admin-form.service';

@ApiTags('Admin Form')
@ApiBearerAuth()
@Controller('admin-form')
export class AdminFormController {
  constructor(private readonly service: AdminFormService) {}

  // --- Form ---

  @Get('form')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'buscar form global' })
  public async getGlobalForm() {
    return await this.service.getGlobalForm();
  }

  @Post('form')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'criar form global' })
  public async createGlobalForm(@Body() dto: { name: string }) {
    return await this.service.createGlobalForm(dto);
  }

  @Patch('form/:id/set-active')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'ativar form global' })
  public async setActiveForm(@Param('id') id: string) {
    return await this.service.setActiveForm(id);
  }

  @Get('form/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'buscar form por id' })
  public async getFormById(@Param('id') id: string) {
    return await this.service.getFormById(id);
  }

  // --- Sections ---

  @Get('section')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'buscar sections do form global' })
  public async getSections(@Query() query: GetAllDtoInput) {
    return await this.service.getSections(query);
  }

  @Get('section/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'buscar section por id' })
  public async getSectionById(@Param('id') id: string) {
    return await this.service.getSectionById(id);
  }

  @Post('section')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'criar section no form global' })
  public async createSection(@Body() dto: { name: string; description?: string }) {
    return await this.service.createSection(dto);
  }

  @Patch('section/:id/set-active')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'ativar/desativar section' })
  public async setActiveSection(@Param('id') id: string) {
    return await this.service.setActiveSection(id);
  }

  @Delete('section/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'excluir section' })
  public async deleteSection(@Param('id') id: string) {
    return await this.service.deleteSection(id);
  }

  @Patch('section/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'atualizar section' })
  public async updateSection(
    @Param('id') id: string,
    @Body() dto: { name: string; description?: string },
  ) {
    return await this.service.updateSection(id, dto);
  }

  @Patch('section/:id/reorder')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'reordenar questões da section' })
  public async reorderQuestions(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return await this.service.reorderQuestions(id, dto);
  }

  @Post('section/:id/duplicate')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'duplicar section' })
  public async duplicateSection(@Param('id') id: string) {
    return await this.service.duplicateSection(id);
  }

  // --- Questions ---

  @Post('question')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'criar question no form global' })
  public async createQuestion(@Body() dto: any) {
    return await this.service.createQuestion(dto);
  }

  @Put('question/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'atualizar question' })
  public async updateQuestion(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return await this.service.updateQuestion(id, dto);
  }

  @Delete('question/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'excluir question' })
  public async deleteQuestion(@Param('id') id: string) {
    return await this.service.deleteQuestion(id);
  }

  @Patch('question/:id/set-active')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarFormularioGlobal)
  @ApiResponse({ description: 'ativar/desativar question' })
  public async setActiveQuestion(@Param('id') id: string) {
    return await this.service.setActiveQuestion(id);
  }
}
