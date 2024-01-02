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
import { ApiTags } from '@nestjs/swagger';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { ContentService } from './content.service';
import { CreateContentDTOInput } from './dtos/create-content.dto.input';
import { StatusContent } from './enum/status-content';
import { UpdateStatusDTOInput } from './dtos/update-status.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from 'src/modules/role/role.entity';
import { Request } from 'express';
import { User } from '../../user/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly subjectService: ContentService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async create(@Body() dto: CreateContentDTOInput) {
    return await this.subjectService.create(dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll(
    @Query('subjectId') subjectId?: number,
    @Query('status') status?: StatusContent,
  ) {
    return await this.subjectService.getAll(subjectId, status);
  }

  @Get('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async getAllOrder(
    @Query('subjectId') subjectId: number,
    @Query('status') status?: StatusContent,
  ) {
    return await this.subjectService.getAllOrder(subjectId, status);
  }

  @Get('demand')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAllDemand() {
    return await this.subjectService.getAllDemand();
  }

  @Patch('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async changeOrder(@Body() dto?: ChangeOrderDTOInput) {
    await this.subjectService.changeOrder(dto);
  }

  @Patch('status')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async changeStatus(@Body() dto: UpdateStatusDTOInput, @Req() req: Request) {
    return await this.subjectService.changeStatus(
      dto.id,
      dto.status,
      req.user as User,
    );
  }

  @Patch('reset/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async reset(@Param('id') id: number, @Req() req: Request) {
    return await this.subjectService.reset(id, req.user as User);
  }

  @Post('upload/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.uploadDemanda)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('id') id: number,
    @UploadedFile() file,
    @Req() req: Request,
  ) {
    return await this.subjectService.uploadFile(id, req.user as User, file);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async delete(@Param('id') id: number) {
    return await this.subjectService.delete(id);
  }
}
