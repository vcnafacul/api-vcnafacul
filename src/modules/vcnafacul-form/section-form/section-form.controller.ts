import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { SectionFormService } from './section-form.service';

@ApiTags('Section Form')
@Controller('section-form')
export class SectionFormController {
  constructor(
    private readonly service: SectionFormService,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
  ) {}

  private async resolvePartnerId(req: Request): Promise<string> {
    const userId = (req.user as User).id;
    const partner =
      await this.partnerPrepCourseService.getByUserId(userId);
    return partner.id;
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'busca todas as seções do formulário do parceiro',
  })
  public async getSectionForm(
    @Req() req: Request,
    @Query() query: GetAllDtoInput,
  ) {
    const partnerId = await this.resolvePartnerId(req);
    return await this.service.getSectionForm(query, partnerId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'busca seção do formulário por id',
  })
  public async getSectionFormById(@Param('id') id: string) {
    return await this.service.getSectionFormById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'cria seção do formulário',
  })
  public async createSectionForm(
    @Req() req: Request,
    @Body() dto: { name: string; description?: string },
  ) {
    const partnerId = await this.resolvePartnerId(req);
    return await this.service.createSectionForm(dto, partnerId);
  }

  @Patch(':id/set-active')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'ativa seção do formulário',
  })
  public async setActiveSectionForm(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const partnerId = await this.resolvePartnerId(req);
    return await this.service.setActiveSectionForm(id, partnerId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'deleta seção do formulário',
  })
  public async deleteSectionForm(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const partnerId = await this.resolvePartnerId(req);
    await this.service.deleteSectionForm(id, partnerId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'atualiza seção do formulário',
  })
  public async updateSectionForm(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: { name: string; description?: string },
  ) {
    const partnerId = await this.resolvePartnerId(req);
    await this.service.updateSectionForm(id, dto, partnerId);
  }

  @Patch(':id/reorder')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'atualiza ordem das questões da seção',
  })
  public async reorderQuestionsSectionForm(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const partnerId = await this.resolvePartnerId(req);
    await this.service.reorderQuestionsSectionForm(id, dto, partnerId);
  }

  @Post(':id/duplicate')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'duplica seção do formulário',
  })
  public async duplicateSection(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const partnerId = await this.resolvePartnerId(req);
    await this.service.duplicateSection(id, partnerId);
  }
}
