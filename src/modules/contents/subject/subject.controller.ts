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
import { SubjectService } from './subject.service';
import { CreateSubjectDTOInput } from './dtos/create-subject.dto.input';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { UpdateSubjectDTOInput } from './dtos/update-subject.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from 'src/modules/role/role.entity';
import { GettAllByFrenteDtoInput } from './dtos/get-all-by-frente.dto.input';

@ApiTags('Subject')
@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async create(@Body() dto: CreateSubjectDTOInput) {
    return await this.subjectService.create(dto);
  }

  // @Get()
  // @UseGuards(PermissionsGuard)
  // @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  // async getAll(@Query('frenteId') frenteId?: number) {
  //   return await this.subjectService.getAll(frenteId);
  // }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll(@Query() query: GettAllByFrenteDtoInput) {
    return await this.subjectService.findAllBy(query);
  }

  @Get('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async getAllOrder(@Query('frenteId') frenteId?: string) {
    return await this.subjectService.getAllOrder(frenteId);
  }

  @Patch('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async changeOrder(@Body() dto?: ChangeOrderDTOInput) {
    return await this.subjectService.changeOrder(dto);
  }

  @Get('frente/:frente')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getByMateria(@Param('frente') frente: string) {
    return await this.subjectService.getByFrente(frente);
  }

  @Patch()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async update(@Body() dto: UpdateSubjectDTOInput) {
    return await this.subjectService.update(dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async delete(@Param('id') id: string) {
    return await this.subjectService.delete(id);
  }
}
