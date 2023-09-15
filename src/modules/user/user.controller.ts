import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDtoInput } from './dto/create.dto.input';
import { LoginDtoInput } from './dto/login.dto.input';
import { UpdateUserDTOInput } from './dto/update.dto.input';
import { ForgotPasswordDtoInput } from './dto/forgot-password.dto.input';
import { ResetPasswordDtoInput } from './dto/reset-password.dto.input';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { User } from './user.entity';
import { HasEmailDtoInput } from './dto/has-email.dto.input';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() userDto: CreateUserDtoInput) {
    return await this.userService.createUser(userDto);
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
  @ApiQuery({ name: 'id', required: false, description: 'ID do usuário' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async find(@Query('id') id?: number) {
    if (id) {
      return await this.userService.findUserById(id);
    }
    return await this.userService.findAll();
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
}
