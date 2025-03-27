import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { Class } from './class.entity';
import { ClassService } from './class.service';
import { ClassDtoOutput } from './dtos/class.dto.output';
import { CreateClassDtoInput } from './dtos/create-class.dto.input';
import { GetClassByIdDtoOutput } from './dtos/get-class-by-id.dto.output';
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
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({
    status: 200,
    description: 'pegar turma por id',
  })
  async getById(@Param('id') id: string): Promise<GetClassByIdDtoOutput> {
    return await this.service.findOneById(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 200,
    description: 'deletar turma',
  })
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  async getAll(
    @Query() dto: GetAllDtoInput,
    @Req() req: Request,
  ): Promise<GetAllOutput<ClassDtoOutput>> {
    return await this.service.getAll(
      dto.page,
      dto.limit,
      (req.user as User).id,
    );
  }

  @Get(':id/attendance-record')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  async getClassByIdToAttendanceRecord(@Param('id') id: string) {
    return await this.service.findOneByIdToAttendanceRecord(id);
  }
}
