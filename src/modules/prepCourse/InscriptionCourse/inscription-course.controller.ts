import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { CreateInscriptionCourseInput } from './dtos/create-inscription-course.dto.input';
import { InscriptionCourseDtoOutput } from './dtos/get-all-inscription.dto.output';
import { UpdateInscriptionCourseDTOInput } from './dtos/update-inscription-course.dto.input';
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
    @Req() req: Request,
  ): Promise<InscriptionCourseDtoOutput> {
    return await this.service.create(dto, (req.user as User).id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async getAll(
    @Query() dto: GetAllDtoInput,
    @Req() req: Request,
  ): Promise<GetAllOutput<InscriptionCourseDtoOutput>> {
    return await this.service.getAll(
      dto.page,
      dto.limit,
      (req.user as User).id,
    );
  }

  @Get('subscribers/:id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async getSubcribers(@Param('id') id: string): Promise<StudentCourse[]> {
    return await this.service.getSubscribers(id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
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

  @Patch()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async update(
    @Body() dto: UpdateInscriptionCourseDTOInput,
    @Req() req: Request,
  ) {
    await this.service.updateFromDTO(dto, (req.user as User).id);
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
