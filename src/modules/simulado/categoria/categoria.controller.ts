import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CreateCategoriaDtoInput } from './dtos/create-categoria.dto.input';
import { CategoriaProxyService } from './categoria.service';

@ApiTags('Simulado - Categoria')
@Controller('mssimulado/categoria')
export class CategoriaProxyController {
  constructor(private readonly categoriaService: CategoriaProxyService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getAll(@Query() query: GetAllDtoInput) {
    return await this.categoriaService.getAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string) {
    return await this.categoriaService.getById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async create(@Body() dto: CreateCategoriaDtoInput) {
    return await this.categoriaService.create(dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async delete(@Param('id') id: string) {
    return await this.categoriaService.delete(id);
  }
}
