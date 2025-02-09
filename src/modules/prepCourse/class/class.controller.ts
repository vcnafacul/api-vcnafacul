import {
  Body,
  Controller,
  Post,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ClassService } from './class.service';
import { CreateClassDtoInput } from './dtos/create-class.dto.input';
import { Class } from './class.entity';

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
}
