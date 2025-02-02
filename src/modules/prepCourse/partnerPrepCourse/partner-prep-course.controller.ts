import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { HasInscriptionActiveDtoOutput } from './dtos/has-inscription-active.output.dto';
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
  ): Promise<void> {
    await this.service.create(dto);
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

  @Get(':id/has-active-inscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 201,
    description: 'verifica se há inscrição ativa para o cursinho parceiro',
  })
  async hasActiveInscription(
    @Param('id') id: string,
  ): Promise<HasInscriptionActiveDtoOutput> {
    return await this.service.hasActiveInscription(id);
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
}
