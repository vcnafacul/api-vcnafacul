import {
  Body,
  Controller,
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
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CreateFrenteProxyDtoInput } from './dtos/create-frente-proxy.dto.input';
import { UpdateFrenteProxyDtoInput } from './dtos/update-frente-proxy.dto.input';
import { FrenteProxyService } from './frente.service';

@ApiTags('Frente')
@Controller('frente')
export class FrenteProxyController {
  constructor(private readonly frenteService: FrenteProxyService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async create(@Body() dto: CreateFrenteProxyDtoInput) {
    return await this.frenteService.create(dto);
  }

  @Get('materiawithcontent/:materia')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getByMateriaContentApproved(@Param('materia') materia: string) {
    return await this.frenteService.getByMateriaContentApproved(materia);
  }

  @Get('materia/:materia')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getByMateria(@Param('materia') materia: string) {
    return await this.frenteService.getByMateria(materia);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(@Query() query: GetAllDtoInput) {
    return await this.frenteService.getAll(query.page, query.limit);
  }

  @Patch()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async updateFromBody(@Body() dto: UpdateFrenteProxyDtoInput) {
    const { id, ...rest } = dto;
    return await this.frenteService.update(id, rest);
  }
}
