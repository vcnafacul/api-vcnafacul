import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Class } from './class.entity';
import { ClassService } from './class.service';
import { CreateClassDtoInput } from './dtos/create-class.dto.input';
import { UpdateClassDTOInput } from './dtos/update-class.dto.input';

@ApiTags('Classes')
@Controller('class')
export class ClassController {
  constructor(private readonly service: ClassService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 201,
    description: 'criar turmas para do cursinho parceiro',
  })
  async createPartnerPrepCourse(
    @Body() dto: CreateClassDtoInput,
    @Req() req: Request,
  ): Promise<Class> {
    return await this.service.create(dto, (req.user as User).id);
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 200,
    description: 'editar turmas para do cursinho parceiro',
  })
  async updatePartnerPrepCourse(
    @Body() dto: UpdateClassDTOInput,
  ): Promise<void> {
    await this.service.update(dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'pegar turma por id',
  })
  async getById(@Param('id') id: string): Promise<Class> {
    return await this.service.findOneById(id);
  }
}
