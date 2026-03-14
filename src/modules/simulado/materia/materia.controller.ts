import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/modules/role/role.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { MateriaProxyService } from './materia.service';

@ApiTags('Materia')
@Controller('materia')
export class MateriaProxyController {
  constructor(private readonly materiaService: MateriaProxyService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async create(@Body() body: Record<string, unknown>) {
    return await this.materiaService.create(body);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll(@Query() query: GetAllDtoInput) {
    return await this.materiaService.getAll(query.page, query.limit);
  }

  @Get('grouped-by-area')
  async getGroupedByArea() {
    return await this.materiaService.getGroupedByArea();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getById(@Param('id') id: string) {
    return await this.materiaService.getById(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return await this.materiaService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async delete(@Param('id') id: string) {
    return await this.materiaService.delete(id);
  }
}
