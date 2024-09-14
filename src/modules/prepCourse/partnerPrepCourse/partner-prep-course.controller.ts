import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { PartnerPrepCourse } from './partner-prep-course.entity';
import { PartnerPrepCourseService } from './partner-prep-course.service';

@ApiTags('PartnerPrepCourse')
@Controller('partner-prep-course')
export class PartnerPrepCourseController {
  constructor(private readonly service: PartnerPrepCourseService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 201,
    description: 'criar cursinho parceiro',
  })
  async createPartnerPrepCourse(
    @Body() dto: PartnerPrepCourseDtoInput,
  ): Promise<PartnerPrepCourse> {
    return await this.service.create(dto);
  }
}
