import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UserDtoOutput } from 'src/modules/user/dto/user.dto.output';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CreateStudentCourseInput } from './dtos/create-student-course.dto.input';
import { CreateStudentCourseOutput } from './dtos/create-student-course.dto.output';
import { GetAllStudentDtoInput } from './dtos/get-all-student.dto.input';
import { GetAllStudentDtoOutput } from './dtos/get-all-student.dto.output';
import { StudentCourseService } from './student-course.service';

@ApiTags('StudentCourse')
@Controller('student-course')
export class StudentCourseController {
  constructor(private readonly service: StudentCourseService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateStudentCourseInput,
  ): Promise<CreateStudentCourseOutput> {
    return await this.service.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findAllByStudent(
    @Query() query: GetAllStudentDtoInput,
  ): Promise<GetAllOutput<GetAllStudentDtoOutput>> {
    return await this.service.findAllByStudent(query);
  }

  @Post('upload')
  @ApiResponse({
    status: 200,
    description: 'upload de documento de estudante',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async uploadImage(@UploadedFile() file, @Req() req: Request) {
    await this.service.uploadDocument(file, (req.user as User).id);
  }

  @Get('document/:fileKey')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'upload de documento de estudante',
  })
  public async getDocument(
    @Param('fileKey') fileKey: string,
    @Res() res: Response,
  ) {
    const file = await this.service.getDocument(fileKey);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileKey}"`,
    });
    return res.status(HttpStatus.OK).send(file);
  }

  @Get('get-user-info/:idPrepPartner')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getUserInfo(
    @Param('idPrepPartner') idPrepPartner: string,
    @Req() req: Request,
  ): Promise<UserDtoOutput> {
    return await this.service.getUserInfoToInscription(
      idPrepPartner,
      (req.user as User).id,
    );
  }
}
