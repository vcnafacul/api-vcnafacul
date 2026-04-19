import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Res,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { CreateHomeFeatureDto } from './dtos/create-home-feature.dto';
import { CreateHomeSupporterDto } from './dtos/create-home-supporter.dto';
import { ReorderItemsDto } from './dtos/reorder-items.dto';
import { UpdateHomeAboutDto } from './dtos/update-home-about.dto';
import { UpdateHomeFeatureSectionDto } from './dtos/update-home-feature-section.dto';
import { UpdateHomeFeatureDto } from './dtos/update-home-feature.dto';
import { UpdateHomeSupporterDto } from './dtos/update-home-supporter.dto';
import { HomeContentService } from './home-content.service';

@ApiTags('HomeContent')
@Controller('home-content')
export class HomeContentController {
  constructor(private readonly service: HomeContentService) {}

  @Get('features/section')
  getFeatureSection() {
    return this.service.getFeatureSection();
  }

  @Put('features/section')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  updateFeatureSection(@Body() dto: UpdateHomeFeatureSectionDto) {
    return this.service.upsertFeatureSection(dto);
  }

  @Get('features')
  getFeatures() {
    return this.service.getFeatures();
  }

  @Post('features')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  createFeature(@Body() dto: CreateHomeFeatureDto) {
    return this.service.createFeature(dto);
  }

  @Patch('features/reorder')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  reorderFeatures(@Body() dto: ReorderItemsDto) {
    return this.service.reorderFeatures(dto);
  }

  @Put('features/:id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  updateFeature(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHomeFeatureDto,
  ) {
    return this.service.updateFeature(id, dto);
  }

  @Delete('features/:id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @HttpCode(204)
  deleteFeature(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteFeature(id);
  }

  @Post('features/:id/image')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @UseInterceptors(FileInterceptor('file'))
  uploadFeatureImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadFeatureImage(id, file);
  }

  @Get('supporters')
  getSupporters() {
    return this.service.getSupporters();
  }

  @Post('supporters')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  createSupporter(@Body() dto: CreateHomeSupporterDto) {
    return this.service.createSupporter(dto);
  }

  @Patch('supporters/reorder')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  reorderSupporters(@Body() dto: ReorderItemsDto) {
    return this.service.reorderSupporters(dto);
  }

  @Put('supporters/:id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  updateSupporter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHomeSupporterDto,
  ) {
    return this.service.updateSupporter(id, dto);
  }

  @Delete('supporters/:id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @HttpCode(204)
  deleteSupporter(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteSupporter(id);
  }

  @Post('supporters/:id/logo')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @UseInterceptors(FileInterceptor('file'))
  uploadSupporterLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadSupporterLogo(id, file);
  }

  @Get('file/:fileKey')
  @ApiResponse({ status: 200, description: 'Arquivo do Home Content' })
  async getFile(
    @Param('fileKey') fileKey: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const key = decodeURIComponent(fileKey);
    const { buffer, contentType } = await this.service.getFile(key);
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800',
    });
    return res.send(Buffer.from(buffer, 'base64'));
  }

  @Get('about')
  getAbout() {
    return this.service.getAbout();
  }

  @Put('about')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  updateAbout(@Body() dto: UpdateHomeAboutDto) {
    return this.service.upsertAbout(dto);
  }

  @Post('about/thumbnail')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @UseInterceptors(FileInterceptor('file'))
  uploadAboutThumbnail(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadAboutThumbnail(file);
  }
}
