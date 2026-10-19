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
  Res,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CollaboratorService } from './collaborator.service';
import { ChangeActiveDtoInput } from './dtos/change-active.dto.input';
import { ExcluirColaboradorDtoInput } from './dtos/excluir-colaborador.dto.input';
import { UpdateCollaboratorFrentesDtoInput } from './dtos/update-collaborator-frentes.dto.input';

/** A foto pública do colaborador: a URL é imutável (ver `getPhoto`). */
export const CACHE_DA_FOTO = 'public, max-age=31536000, immutable';

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

  /**
   * Ex-membros do cursinho de quem pede (tickets/040, card 05).
   * ⚠️ Literal antes de qualquer `:id` (ver `collaborator-rotas.controller.spec.ts`).
   */
  @Get('ex-membros')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async getExMembros(@Query() query: GetAllDtoInput, @Req() req: Request) {
    return await this.service.getExMembros(
      (req.user as User).id,
      query.page,
      query.limit,
    );
  }

  @Get('frentes/batch')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async getFrentesBatch(
    @Req() req: Request,
  ): Promise<Record<string, string[]>> {
    return await this.service.getFrentesBatch((req.user as User).id);
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

  @Patch(':id/photo')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImageAdmin(
    @Param('id') collaboratorId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.service.uploadImageByCollaboratorId(file, collaboratorId);
  }

  @Delete('photo')
  @UseGuards(JwtAuthGuard)
  async removeImage(@Req() req: Request) {
    return await this.service.removeImage((req.user as User).id);
  }

  @Delete(':id/photo')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async removeImageAdmin(@Param('id') collaboratorId: string) {
    return await this.service.removeImageByCollaboratorId(collaboratorId);
  }

  @Patch(':id/active')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async changeActive(
    @Param('id') id: string,
    @Body() body: ChangeActiveDtoInput,
    @Req() req: Request,
  ) {
    return await this.service.changeActive(
      id,
      (req.user as User).id,
      body?.actived,
    );
  }

  /**
   * Exclui o colaborador: vira ex-membro (tickets/040). `PATCH` e não
   * `DELETE`: o corpo (`roleId`) não sobrevive a todo proxy num DELETE.
   */
  @Patch(':id/excluir')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async excluir(
    @Param('id') id: string,
    @Body() body: ExcluirColaboradorDtoInput,
    @Req() req: Request,
  ) {
    return await this.service.excluir(id, (req.user as User).id, body?.roleId);
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
    @Req() req: Request,
  ) {
    return await this.service.changeDescription(
      id,
      (req.user as User).id,
      body.description,
    );
  }

  @Get(':imageKey/photo')
  async getPhoto(
    @Param('imageKey') imageKey: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Keys com prefix (collaborators/<uuid>.<ext>) chegam URL-encoded do
    // client. Decode pra recompor a chave original do R2.
    const foto = await this.service.getPhoto(decodeURIComponent(imageKey));
    /*
      Cache no navegador (2026-10-19), além do Redis de 30 dias no servidor.
      ⚠️ Seguro guardar "para sempre": toda foto nova nasce com uma chave nova
      (`collaborators/<uuid>.<ext>`), e trocar ou remover apaga a antiga do R2
      e do Redis — a mesma URL nunca muda de conteúdo. Só no sucesso: um erro
      (chave que não existe) nunca fica guardado no navegador.
    */
    res.setHeader('Cache-Control', CACHE_DA_FOTO);
    return foto;
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

  /**
   * ⚠️ Era só login: qualquer conta lia as frentes de qualquer colaborador. E o
   * `PUT :id/frentes`, que deixava qualquer conta SOBRESCREVÊ-LAS, foi removido
   * — ninguém o usava (tickets-documentacao, card 42).
   */
  @Get(':id/frentes')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarColaboradores)
  async getFrentes(@Param('id') id: string, @Req() req: Request) {
    return this.service.getEnrichedFrentes(id, (req.user as User).id);
  }
}
