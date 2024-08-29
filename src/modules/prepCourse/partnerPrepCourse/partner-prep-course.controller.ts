import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PartnerPrepCourse } from './partner-prep-course.entity';
import { PartnerPrepCourseService } from './partner-prep-course.service';

@ApiTags('PartnerPrepCourse')
@Controller('partner-prep-course')
export class PartnerPrepCourseController {
  constructor(private readonly service: PartnerPrepCourseService) {}

  @Post()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'criar cursinho parceiro',
  })
  @UseGuards(JwtAuthGuard)
  async createPartnerPrepCourse(
    @Body() dto: PartnerPrepCourse,
  ): Promise<PartnerPrepCourse> {
    return await this.service.createPartnerPrepCourse(dto);
  }
}
