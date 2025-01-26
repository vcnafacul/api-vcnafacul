import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
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
import { ScheduleEnrolledDtoInput } from './dtos/schedule-enrolled.dto.input';
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

  @Get('confirm-enrolled/:id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  async confirmEnrolled(@Param('id') id: string): Promise<void> {
    return await this.service.confirmEnrolled(id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
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
  @UseInterceptors(FilesInterceptor('files', 10)) // Limite de 10 arquivos
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async uploadImage(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    await this.service.uploadDocument(files, (req.user as User).id);
  }

  @Post('profile-photo')
  @ApiResponse({
    status: 200,
    description: 'upload de foto da carteira estudantil',
  })
  @UseInterceptors(FileInterceptor('file')) // Limite de 10 arquivos
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async profilePhoto(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    await this.service.profilePhoto(file, (req.user as User).id);
  }

  @Get('document/:fileKey')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'Busca de documento de estudante',
  })
  public async getDocument(
    @Param('fileKey') fileKey: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.service.getDocument(fileKey);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${fileKey}"`,
    });

    // Codifique o buffer em Base64
    const base64Buffer = buffer.toString('base64');

    return res.status(HttpStatus.OK).json({
      buffer: base64Buffer,
      contentType,
    });
  }

  @Get('profile-photo/:fileKey')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  @ApiResponse({
    status: 200,
    description: 'Busca de documento de estudante',
  })
  public async getProfilePhoto(
    @Param('fileKey') fileKey: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.service.getProfilePhoto(fileKey);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${fileKey}"`,
    });

    // Codifique o buffer em Base64
    const base64Buffer = buffer.toString('base64');

    return res.status(HttpStatus.OK).json({
      buffer: base64Buffer,
      contentType,
    });
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

  @Get('declared-interest/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async verifyDeclaredInterest(@Param('id') id: string): Promise<boolean> {
    return await this.service.verifyDeclaredInterest(id);
  }

  @Patch('update-is-free')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  async updateIsFree(
    @Body() dto: { idStudentCourse: string; isFree: boolean },
  ): Promise<void> {
    await this.service.updateIsFreeInfo(dto.idStudentCourse, dto.isFree);
  }

  @Patch('update-select-enrolled')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  async updateEnrolledInfo(
    @Body() dto: { idStudentCourse: string; enrolled: boolean },
  ): Promise<void> {
    await this.service.updateSelectEnrolled(dto.idStudentCourse, dto.enrolled);
  }

  @Post('schedule-enrolled')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @HttpCode(200) // Define explicitamente o código de status
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarProcessoSeletivo)
  async scheduleEnrolled(@Body() dto: ScheduleEnrolledDtoInput): Promise<void> {
    await this.service.scheduleEnrolled(dto);
  }

  @Patch('declared-interest')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200) // Define explicitamente o código de status
  async declaredInterest(
    @Body()
    {
      studentId,
      areaInterest,
      selectedCourses,
    }: {
      studentId: string;
      areaInterest: string[];
      selectedCourses: string[];
    },
  ): Promise<void> {
    await this.service.declaredInterest(
      studentId,
      areaInterest,
      selectedCourses,
    );
  }

  @Patch('reset-student')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200) // Define explicitamente o código de status
  async resetStudent(
    @Body()
    { studentId }: { studentId: string },
  ): Promise<void> {
    await this.service.resetStudent(studentId);
  }

  @Patch('reject-student')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200) // Define explicitamente o código de status
  async rejectStudent(
    @Body() { studentId, reason }: { studentId: string; reason: string },
  ): Promise<void> {
    await this.service.rejectStudent(studentId, reason);
  }
}
