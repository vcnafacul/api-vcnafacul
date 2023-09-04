import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { UpdateUserRoleInput } from './dto/update-user-role.dto.input';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { User } from '../user/user.entity';

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
  @UseGuards(JwtAuthGuard)
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
