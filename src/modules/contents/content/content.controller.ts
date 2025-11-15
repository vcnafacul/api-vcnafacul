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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { User } from '../../user/user.entity';
import { ContentService } from './content.service';
import { ContentStatsByFrenteDtoOutput } from './dtos/content-stats-by-frente.dto.output';
import { CreateContentDTOInput } from './dtos/create-content.dto.input';
import { GetAllContentDtoInput } from './dtos/get-all-content.dto.input';
import { UpdateStatusDTOInput } from './dtos/update-status.dto.input';
import { StatusContent } from './enum/status-content';
import { SnapshotContentStatus } from './entities/snapshot-content-status/snapshot-content-status.entity';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async create(@Body() dto: CreateContentDTOInput, @Req() req: Request) {
    return await this.contentService.create(dto, req.user as User);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll(@Query() query: GetAllContentDtoInput) {
    return await this.contentService.findAllBy(query);
  }

  @Get('order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getAllOrder(
    @Query('subjectId') subjectId: string,
    @Query('status') status?: StatusContent,
  ) {
    return await this.contentService.getAllOrder(subjectId, status);
  }

  @Get('demand')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAllDemand(@Query() query: GetAllDtoInput) {
    return await this.contentService.getAllDemand(query);
  }

  @Patch('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async changeOrder(@Body() dto?: ChangeOrderDTOInput) {
    await this.contentService.changeOrder(dto);
  }

  @Patch('status')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async changeStatus(@Body() dto: UpdateStatusDTOInput, @Req() req: Request) {
    return await this.contentService.changeStatus(
      dto.id,
      dto.status,
      req.user as User,
    );
  }

  @Patch('reset/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async reset(@Param('id') id: string, @Req() req: Request) {
    return await this.contentService.reset(id, req.user as User);
  }

  @Post('upload/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.uploadDemanda)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return await this.contentService.uploadFile(id, req.user as User, file);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async delete(@Param('id') id: string) {
    return await this.contentService.delete(id);
  }

  @Get('file/:id')
  async getFile(@Param('id') id: string) {
    return await this.contentService.getFile(id);
  }

  @Get('summary')
  async getSummary() {
    return await this.contentService.getSummary();
  }

  @Get('stats-by-frente')
  @ApiOperation({
    summary: 'Obter estatísticas de conteúdos agrupadas por frente',
    description:
      'Retorna estatísticas de conteúdos (pendentes, aprovados, reprovados, pendentes de upload e total) agrupadas por matéria e frente',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    type: [ContentStatsByFrenteDtoOutput],
  })
  async getStatsByFrente(): Promise<ContentStatsByFrenteDtoOutput[]> {
    return await this.contentService.getStatsByFrente();
  }

  @Get('snapshot-content-status')
  @ApiOperation({
    summary: 'Obter snapshot de estatísticas de conteúdos',
    description: 'Retorna snapshot de estatísticas de conteúdos',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    type: [ContentStatsByFrenteDtoOutput],
  })
  async getSnapshotContentStatus(): Promise<SnapshotContentStatus[]> {
    return await this.contentService.getSnapshotContentStatus();
  }
}
