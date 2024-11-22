import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { CreateUserDtoInput } from 'src/modules/user/dto/create.dto.input';
import { UserDtoOutput } from 'src/modules/user/dto/user.dto.output';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
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

  @Post('user/:hashPrepCourse')
  async createUser(
    @Body() userDto: CreateUserDtoInput,
    @Param('hashPrepCourse') hashPrepCourse: string,
  ): Promise<void> {
    return await this.service.createUser(userDto, hashPrepCourse);
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
  public async uploadImage(
    @UploadedFile() files: Array<Express.Multer.File>,
    @Req() req: Request,
  ) {
    await this.service.uploadDocument(files, (req.user as User).id);
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

  @Patch('update-is-free')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async updateIsFree(
    @Body() dto: { idStudentCourse: string; isFree: boolean },
  ): Promise<void> {
    await this.service.updateIsFreeInfo(dto.idStudentCourse, dto.isFree);
  }

  @Patch('update-application-status')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async updateApplicationStatus(
    @Body() dto: { idStudentCourse: string; applicationStatus: Status },
  ): Promise<void> {
    await this.service.updateApplicationStatusInfo(
      dto.idStudentCourse,
      dto.applicationStatus,
    );
  }

  @Patch('update-select-enrolled')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(
    PermissionsGuard.name,
    Permissions.gerenciarInscricoesCursinhoParceiro,
  )
  async updateEnrolledInfo(
    @Body() dto: { idStudentCourse: string; enrolled: boolean },
  ): Promise<void> {
    await this.service.updateSelectEnrolled(dto.idStudentCourse, dto.enrolled);
  }
}
