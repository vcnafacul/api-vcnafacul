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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { CoursePeriodService } from './course-period.service';
import { CreateCoursePeriodDtoInput } from './dtos/create-course-period.dto.input';
import { UpdateCoursePeriodDtoInput } from './dtos/update-course-period.dto.input';

@ApiTags('Course Period')
@Controller('course-period')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoursePeriodController {
  constructor(private readonly service: CoursePeriodService) {}

  @Post()
  @ApiResponse({
    status: 201,
    description: 'Course period created successfully',
  })
  async create(@Body() dto: CreateCoursePeriodDtoInput, @Req() req: Request) {
    return await this.service.create(dto, (req.user as User).id);
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Get all course periods',
  })
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: Request,
  ) {
    return await this.service.getAll(page, limit, (req.user as User).id);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Get course period by id',
  })
  async findOneById(@Param('id') id: string, @Req() req: Request) {
    return await this.service.findOneById(id, (req.user as User).id);
  }

  @Patch()
  @ApiResponse({
    status: 200,
    description: 'Course period updated successfully',
  })
  async update(@Body() dto: UpdateCoursePeriodDtoInput) {
    return await this.service.update(dto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'Course period deleted successfully',
  })
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
