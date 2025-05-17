import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { UpdateRoleDtoInput } from 'src/modules/role/dto/update.role.dto';
import { Permissions, Role } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { GetAllPrepCourseDtoOutput } from './dtos/get-all-prep-course.dto.outoput';
import { GetOnePrepCourseByIdDtoOutput } from './dtos/get-one-prep-course-by-id.dto.output';
import { inviteMembersInputDto } from './dtos/invite-members.input.dto';
import { PartnerPrepCourseService } from './partner-prep-course.service';

@ApiTags('PartnerPrepCourse')
@Controller('partner-prep-course')
export class PartnerPrepCourseController {
  constructor(private readonly service: PartnerPrepCourseService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @ApiResponse({
    status: 201,
    description: 'criar cursinho parceiro',
  })
  async createPartnerPrepCourse(
    @Body() dto: PartnerPrepCourseDtoInput,
    @UploadedFiles()
    files: {
      partnershipAgreement?: Express.Multer.File;
      logo?: Express.Multer.File;
    },
    @Req() req: Request,
  ): Promise<void> {
    await this.service.create(
      dto,
      (req.user as User).id,
      files.partnershipAgreement,
      files.logo,
    );
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async getAll(
    @Query() dto: GetAllDtoInput,
  ): Promise<GetAllOutput<GetAllPrepCourseDtoOutput>> {
    return await this.service.getAll(dto.page, dto.limit);
  }

  @Get('invite-members-accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async inviteMemberAccept(@Req() req: Request): Promise<void> {
    return await this.service.inviteMemberAccept(
      (req.user as User).id,
      (req.user as any).partner as string,
    );
  }

  // TODO: repensarr se é necessário mover para outro controller (role)
  // Permissões precisam ser gerenciarPermissoesCursinho e alterarPermissao
  @Get('role-base')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarPermissoesCursinho)
  @ApiResponse({
    status: 200,
    description: 'obter as permissões base',
  })
  async getBaseRoles(@Req() req: Request): Promise<Role[]> {
    return await this.service.getBaseRoles((req.user as User).id);
  }

  @Get('role')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarPermissoesCursinho)
  @ApiResponse({
    status: 200,
    description: 'obter as permissões do cursinho parceiro',
  })
  async getRoles(@Req() req: Request): Promise<Role[]> {
    return await this.service.getRoles((req.user as User).id);
  }

  @Post('role')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarPermissoesCursinho)
  @ApiResponse({
    status: 201,
    description: 'criar permissão cursinho parceiro',
  })
  async createRole(
    @Body() dto: CreateRoleDtoInput,
    @Req() req: Request,
  ): Promise<Role> {
    return await this.service.createRole(dto, (req.user as User).id);
  }

  @Patch('role')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarPermissoesCursinho)
  async update(@Body() dto: UpdateRoleDtoInput, @Req() req: Request) {
    return await this.service.updateRole(dto, (req.user as User).id);
  }

  @Post('invite-members')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  @ApiResponse({
    status: 200,
    description: 'convidar membros para o cursinho parceiro',
  })
  async inviteMembers(
    @Body() dto: inviteMembersInputDto,
    @Req() req: Request,
  ): Promise<void> {
    return await this.service.inviteMember(dto.email, (req.user as User).id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async getOneById(
    @Param('id') id: string,
  ): Promise<GetOnePrepCourseByIdDtoOutput> {
    return await this.service.getOneById(id);
  }
}
