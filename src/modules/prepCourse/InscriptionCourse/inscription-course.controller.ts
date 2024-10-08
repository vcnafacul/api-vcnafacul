import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async create(
    @Body() dto: CreateInscriptionCourseInput,
  ): Promise<InscriptionCourse> {
    return await this.service.create(dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string): Promise<InscriptionCourse> {
    return await this.service.getById(id);
  }

  @Put('active/:id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async active(@Param('id') id: string): Promise<void> {
    await this.service.activeInscriptionCourse(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async cancel(@Param('id') id: string): Promise<void> {
    await this.service.cancelInscriptionCourse(id);
  }
}
