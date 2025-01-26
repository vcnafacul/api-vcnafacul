import {
  Controller,
  Delete,
  Get,
  Patch,
  Query,
  Req,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CollaboratorService } from './collaborator.service';
import { GetAllCollaboratorDtoInput } from './dtos/get-all-collaborator.dto.input';

@ApiTags('Collaborator')
@Controller('collaborator')
export class CollaboratorController {
  constructor(private readonly service: CollaboratorService) {}

  @Get()
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async getCollaborator(@Query() query: GetAllCollaboratorDtoInput) {
    return await this.service.getCollaborator(query);
  }

  @Patch(`photo`)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return await this.service.uploadImage(file, (req.user as User).id);
  }

  @Delete('photo')
  @UseGuards(JwtAuthGuard)
  async removeImage(@Req() req: Request) {
    return await this.service.removeImage((req.user as User).id);
  }
}
