import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Put,
  Req,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { UpdateUserRoleInput } from './dto/update-user-role.dto.input';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { User } from '../user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';

@ApiTags('UserRole')
@Controller('userrole')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return await this.userRoleService.findAll();
  }

  @Put()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza informações de cursinhos',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async updateUserRole(
    @Body() userRoleUpdate: UpdateUserRoleInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (await this.userRoleService.update(userRoleUpdate, req.user as User)) {
      return res.status(HttpStatus.OK).send('Updated successfully');
    }
    return res.status(HttpStatus.NOT_MODIFIED).send('Not updated');
  }

  @Get('user')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findRelations() {
    return await this.userRoleService.findUserRole();
  }
}
