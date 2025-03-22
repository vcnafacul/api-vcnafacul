import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { CreateUserDtoInput } from './dto/create.dto.input';
import { ForgotPasswordDtoInput } from './dto/forgot-password.dto.input';
import { GetUserDtoInput } from './dto/get-user.dto.input';
import { HasEmailDtoInput } from './dto/has-email.dto.input';
import { LoginDtoInput } from './dto/login.dto.input';
import { ResetPasswordDtoInput } from './dto/reset-password.dto.input';
import { UpdateUserRoleInput } from './dto/update-user-role.dto.input';
import { UpdateUserDTOInput } from './dto/update.dto.input';
import { UserWithRoleName } from './dto/userWithRoleName';
import { User } from './user.entity';
import { UserService } from './user.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() userDto: CreateUserDtoInput) {
    return await this.userService.create(userDto);
  }

  @Post('login')
  async signIn(@Body() login: LoginDtoInput, @Res() res: Response) {
    return res.status(200).json(await this.userService.signIn(login));
  }

  @Post('hasemail')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async hasEmail(@Body() dto: HasEmailDtoInput, @Res() res: Response) {
    return res.status(200).json(false);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async find(
    @Query() query: GetUserDtoInput,
  ): Promise<GetAllDtoOutput<UserWithRoleName>> {
    return await this.userService.findAllByWithRoleName(query);
  }

  @Put()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async update(
    @Body() updateUser: UpdateUserDTOInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (await this.userService.update(updateUser, (req.user as User).id)) {
      return res.status(HttpStatus.OK).send('Updated successfully');
    }
    return res.status(HttpStatus.NOT_MODIFIED).send('Not updated');
  }

  @Post('forgot')
  async forgot(@Body() forgotPassword: ForgotPasswordDtoInput) {
    return await this.userService.forgotPassword(forgotPassword.email);
  }

  @Patch('reset')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async reset(
    @Body() resetPassword: ResetPasswordDtoInput,
    @Req() req: Request,
  ) {
    return await this.userService.reset(resetPassword, (req.user as User).id);
  }

  @Patch('confirmemail')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async confirmEmail(@Req() req: Request) {
    return await this.userService.confirmEmail((req.user as User).id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    return await this.userService.me((req.user as User).id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string) {
    return await this.userService.findUserById(id);
  }

  @Patch('updateRole')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarPermissoesCursinho)
  async updateRole(@Body() dto: UpdateUserRoleInput) {
    return await this.userService.updateRole(dto.userId, dto.roleId);
  }
}
