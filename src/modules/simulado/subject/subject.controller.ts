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
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { SubjectProxyService } from './subject.service';

@ApiTags('Subject')
@Controller('subject')
export class SubjectProxyController {
  constructor(private readonly subjectService: SubjectProxyService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async create(@Body() dto: any) {
    return await this.subjectService.create(dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 40,
    @Query('frente') frente?: string,
  ) {
    return await this.subjectService.getAll(page, limit, frente);
  }

  @Get('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async getAllOrder(@Query('frenteId') frenteId?: string) {
    return await this.subjectService.getOrder(frenteId);
  }

  @Patch('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async changeOrder(@Body() dto: any) {
    return await this.subjectService.changeOrder(dto);
  }

  @Get('frente/:frente')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getByFrente(@Param('frente') frente: string) {
    return await this.subjectService.getByFrente(frente);
  }

  @Patch()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async updateFromBody(@Body() dto: any) {
    const { id, ...rest } = dto;
    return await this.subjectService.update(id, rest);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async delete(@Param('id') id: string) {
    return await this.subjectService.delete(id);
  }
}
