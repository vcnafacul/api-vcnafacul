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
import { User } from 'src/modules/user/user.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ContentProxyService } from './content.service';

@ApiTags('Content')
@Controller('content')
export class ContentProxyController {
  constructor(private readonly contentService: ContentProxyService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async create(@Body() dto: any, @Req() req: Request) {
    return await this.contentService.create(dto, (req.user as User).id);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll(@Query() query: any) {
    return await this.contentService.getAll(query);
  }

  @Get('order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getAllOrder(
    @Query('subjectId') subjectId: string,
    @Query('status') status?: number,
  ) {
    return await this.contentService.getBySubject(subjectId, status);
  }

  @Get('demand')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAllDemand(@Query() query: GetAllDtoInput) {
    return await this.contentService.getDemands(query.page, query.limit);
  }

  @Patch('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async changeOrder(@Body() dto: any) {
    return await this.contentService.changeOrder(dto);
  }

  @Patch('status')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async changeStatus(@Body() dto: any, @Req() req: Request) {
    return await this.contentService.changeStatus(
      dto.id,
      dto.status,
      (req.user as User).id,
    );
  }

  @Patch('reset/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async reset(@Param('id') id: string, @Req() req: Request) {
    return await this.contentService.reset(id, (req.user as User).id);
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
    return await this.contentService.uploadFile(
      id,
      (req.user as User).id,
      file,
    );
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
  })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  async getStatsByFrente() {
    return await this.contentService.getStatsByFrente();
  }

  @Get('snapshot-content-status')
  @ApiOperation({
    summary: 'Obter snapshot de estatísticas de conteúdos',
  })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  async getSnapshotContentStatus() {
    return await this.contentService.getSnapshotContentStatus();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getById(@Param('id') id: string) {
    return await this.contentService.getById(id);
  }
}
