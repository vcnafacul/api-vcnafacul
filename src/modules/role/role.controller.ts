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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from './permissions/permissions';
import { CreateRoleDtoInput } from './dto/create-role.dto';
import { GetAllRoleDto } from './dto/get-all-role.dto';
import { RoleService } from './role.service';
import { UpdateRoleDtoInput } from './dto/update.role.dto';
import { PERMISSION_HIERARCHY } from './permissions/permission-hierarchy';
import { PermissionGroupResponseDto } from './dto/permission-group-response.dto';

@ApiTags('Role')
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async find(
    @Query() query: GetAllDtoInput,
  ): Promise<GetAllDtoOutput<GetAllRoleDto>> {
    return await this.roleService.findAllByDTO(query);
  }

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async findAll() {
    return await this.roleService.findAll();
  }

  @Get('permissions/hierarchy')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getPermissionsHierarchy() {
    return PERMISSION_HIERARCHY;
  }

  @Get(':id/permissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: [PermissionGroupResponseDto] })
  async getPermissions(
    @Param('id') id: string,
  ): Promise<PermissionGroupResponseDto[]> {
    return await this.roleService.findOneByIdWithPermissions(id);
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

  @Patch()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async update(@Body() dto: UpdateRoleDtoInput) {
    return await this.roleService.update(dto);
  }
}
