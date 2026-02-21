import {
  Controller,
  Get,
  Param,
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

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll(@Query() query: GetAllDtoInput) {
    return await this.materiaService.getAll(query.page, query.limit);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getById(@Param('id') id: string) {
    return await this.materiaService.getById(id);
  }
}
