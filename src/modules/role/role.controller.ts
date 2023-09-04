import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';

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
}
