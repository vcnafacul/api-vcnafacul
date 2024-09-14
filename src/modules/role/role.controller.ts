import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { CreateRoleDtoInput } from './dto/create-role.dto';
import { GetAllRoleDto } from './dto/get-all-role.dto';
import { RoleService } from './role.service';

@ApiTags('Role')
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async find(
    @Query() query: GetAllDtoInput,
  ): Promise<GetAllDtoOutput<GetAllRoleDto>> {
    return await this.roleService.findAllByDTO(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string) {
    return await this.roleService.findOneBy({ id });
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async create(@Body() dto: CreateRoleDtoInput) {
    return await this.roleService.create(dto);
  }
}
