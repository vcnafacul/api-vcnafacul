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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { User } from '../../user/user.entity';
import { ContentService } from './content.service';
import { CreateContentDTOInput } from './dtos/create-content.dto.input';
import { GetAllContentDtoInput } from './dtos/get-all-content.dto.input';
import { UpdateStatusDTOInput } from './dtos/update-status.dto.input';
import { StatusContent } from './enum/status-content';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async create(@Body() dto: CreateContentDTOInput) {
    return await this.contentService.create(dto);
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
    @UploadedFile() file,
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
}
