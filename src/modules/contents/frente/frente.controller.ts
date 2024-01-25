import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FrenteService } from './frente.service';
import { CreateFrenteDTOInput } from './dtos/create-frente.dto.input';
import { Materias } from './enum/materias';
import { UpdateFrenteDTOInput } from './dtos/update-frente.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from 'src/modules/role/role.entity';

@ApiTags('Frente')
@Controller('frente')
export class FrenteController {
  constructor(private readonly frenteService: FrenteService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async create(@Body() dto: CreateFrenteDTOInput) {
    return await this.frenteService.create(dto);
  }

  @Get('materiawithcontent/:materia')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getByMateriaContentApproved(@Param('materia') materia: Materias) {
    return await this.frenteService.getByMateriaContentApproved(materia);
  }

  @Get('materia/:materia')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getByMateria(@Param('materia') materia: Materias) {
    return await this.frenteService.getByMateria(materia);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll() {
    return await this.frenteService.getAll();
  }

  @Patch()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async update(@Body() dto: UpdateFrenteDTOInput) {
    return await this.frenteService.update(dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async delete(@Param('id') id: number) {
    return await this.frenteService.delete(id);
  }
}
