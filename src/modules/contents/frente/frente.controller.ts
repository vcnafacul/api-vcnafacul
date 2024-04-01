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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/modules/role/role.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CreateFrenteDTOInput } from './dtos/create-frente.dto.input';
import { UpdateFrenteDTOInput } from './dtos/update-frente.dto.input';
import { Materias } from './enum/materias';
import { Frente } from './frente.entity';
import { FrenteService } from './frente.service';

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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  async getAll(
    @Query() query: GetAllDtoInput,
  ): Promise<GetAllDtoOutput<Frente>> {
    return await this.frenteService.findAllBy(query);
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
