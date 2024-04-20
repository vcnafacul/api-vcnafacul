import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Put,
  Query,
  Req,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { User } from '../user/user.entity';
import { UpdateUserRoleInput } from './dto/update-user-role.dto.input';
import { UserRole } from './user-role.entity';
import { UserRoleService } from './user-role.service';
import { UserRoleDTO } from './dto/user-role.dto.output';

@ApiTags('UserRole')
@Controller('userrole')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async find(
    @Query() query: GetAllDtoInput,
  ): Promise<GetAllDtoOutput<UserRole>> {
    return await this.userRoleService.findAllBy(query);
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
  async findUser(
    @Query() query: GetAllDtoInput,
  ): Promise<GetAllDtoOutput<UserRoleDTO>> {
    return await this.userRoleService.findUserRole(query);
  }
}
