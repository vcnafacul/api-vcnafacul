import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
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
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CollaboratorService } from './collaborator.service';
import { UpdateCollaboratorFrentesDtoInput } from './dtos/update-collaborator-frentes.dto.input';

@ApiTags('Collaborator')
@Controller('collaborator')
export class CollaboratorController {
  constructor(private readonly service: CollaboratorService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async getCollaborator(@Query() query: GetAllDtoInput, @Req() req: Request) {
    return await this.service.getCollaborator({
      ...query,
      userId: (req.user as User).id,
    });
  }

  @Get(':id/prepCourse')
  async getCollaboratorByPrepPartner(@Param('id') id: string) {
    return await this.service.getCollaboratorByPrepPartner(id);
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

  @Patch(':id/active')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async changeActive(@Param('id') id: string) {
    return await this.service.changeActive(id);
  }

  @Patch(':id/description')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async changeDescription(
    @Param('id') id: string,
    @Body()
    body: {
      description: string;
    },
  ) {
    return await this.service.changeDescription(id, body.description);
  }
  @Get(':imageKey/photo')
  async getPhoto(@Param('imageKey') imageKey: string) {
    return await this.service.getPhoto(imageKey);
  }

  @Put('me/frentes')
  @UseGuards(JwtAuthGuard)
  async updateMyFrentes(
    @Body() dto: UpdateCollaboratorFrentesDtoInput,
    @Req() req: Request,
  ): Promise<void> {
    const collaborator = await this.service.findCollaboratorByUserId(
      (req.user as User).id,
    );
    return this.service.updateFrentes(collaborator.id, dto.frenteIds);
  }

  @Put(':id/frentes')
  @UseGuards(JwtAuthGuard)
  async updateFrentes(
    @Param('id') id: string,
    @Body() dto: UpdateCollaboratorFrentesDtoInput,
  ): Promise<void> {
    return this.service.updateFrentes(id, dto.frenteIds);
  }

  @Get(':id/frentes')
  @UseGuards(JwtAuthGuard)
  async getFrentes(@Param('id') id: string): Promise<any> {
    return this.service.getEnrichedFrentes(id);
  }
}
