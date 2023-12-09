import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { CreateRoleDtoInput } from './dto/create-role.dto';

@ApiTags('Role')
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiQuery({ name: 'id', required: false, description: 'ID do role' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async find(@Query('id') id?: number) {
    if (id) {
      return await this.roleService.findById(id);
    }
    return await this.roleService.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async create(@Body() dto: CreateRoleDtoInput) {
    return await this.roleService.create(dto);
  }
}
