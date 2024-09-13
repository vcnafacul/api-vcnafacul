import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/modules/role/role.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CreateInscriptionCourseInput } from './dtos/create-inscription-course.dto.input';
import { InscriptionCourse } from './inscription-course.entity';
import { InscriptionCourseService } from './inscription-course.service';

@ApiTags('InscriptionCourse')
@Controller('inscription-course')
export class InscriptionCourseController {
  constructor(private readonly service: InscriptionCourseService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.abrirInscricoesCursinhoParceiro,
  )
  async create(@Body() dto: CreateInscriptionCourseInput): Promise<void> {
    await this.service.create(dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string): Promise<InscriptionCourse> {
    return await this.service.getById(id);
  }
}
