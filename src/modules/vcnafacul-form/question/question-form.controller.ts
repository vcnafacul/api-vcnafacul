import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { QuestionFormService } from './question-form.service';

@ApiTags('Question Form')
@Controller('question-form')
export class QuestionFormController {
  constructor(
    private readonly service: QuestionFormService,
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
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'busca todas as seções do formulário',
  })
  public async getQuestionForm(query: GetAllDtoInput) {
    return await this.service.getQuestionForm(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'busca seção do formulário por id',
  })
  public async getQuestionFormById(@Param('id') id: string) {
    return await this.service.getQuestionFormById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'cria seção do formulário',
  })
  public async createQuestionForm(
    @Req() req: Request,
    @Body() dto: unknown,
  ) {
    try {
      const partnerId = await this.resolvePartnerId(req);
      return await this.service.createQuestionForm(dto, partnerId);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Patch(':id/set-active')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'ativa seção do formulário',
  })
  public async setActiveQuestionForm(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const partnerId = await this.resolvePartnerId(req);
    await this.service.setActiveQuestionForm(id, partnerId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'deleta seção do formulário',
  })
  public async deleteQuestionForm(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const partnerId = await this.resolvePartnerId(req);
    await this.service.deleteQuestionForm(id, partnerId);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'atualiza seção do formulário',
  })
  public async updateQuestionForm(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: unknown,
  ) {
    const partnerId = await this.resolvePartnerId(req);
    await this.service.updateQuestionForm(id, dto, partnerId);
  }
}
