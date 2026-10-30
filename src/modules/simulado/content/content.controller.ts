import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ContentProxyService } from './content.service';
import { ChangeOrderDto } from './dtos/change-order.dto';
import { ChangeStatusDto } from './dtos/change-status.dto';
import { CreateContentDto } from './dtos/create-content.dto';
import { ReviewProposalDto } from './dtos/review-proposal.dto';
import { SendVideoDto } from './dtos/send-video.dto';
import { docxUploadOptions } from './upload-docx.options';

@ApiTags('Content')
@Controller('content')
export class ContentProxyController {
  constructor(private readonly contentService: ContentProxyService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async create(@Body() dto: CreateContentDto, @Req() req: Request) {
    return await this.contentService.create(dto, (req.user as User).id);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAll(@Query() query: any) {
    return await this.contentService.getAll(query);
  }

  @Get('order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getAllOrder(
    @Query('subjectId') subjectId: string,
    @Query('status') status?: number,
  ) {
    return await this.contentService.getBySubject(subjectId, status);
  }

  @Get('demand')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getAllDemand(@Query() query: GetAllDtoInput) {
    return await this.contentService.getDemands(query.page, query.limit);
  }

  @Patch('order')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async changeOrder(@Body() dto: ChangeOrderDto) {
    return await this.contentService.changeOrder(dto);
  }

  @Patch('status')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async changeStatus(@Body() dto: ChangeStatusDto, @Req() req: Request) {
    return await this.contentService.changeStatus(
      dto.id,
      dto.status,
      (req.user as User).id,
      dto.reason,
    );
  }

  @Patch('reset/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async reset(@Param('id') id: string, @Req() req: Request) {
    return await this.contentService.reset(id, (req.user as User).id);
  }

  @Post('upload/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.uploadDemanda)
  @UseInterceptors(FileInterceptor('file', docxUploadOptions))
  async upload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return await this.contentService.uploadFile(
      id,
      (req.user as User).id,
      file,
    );
  }

  /** Envio de vídeo do YouTube: o "upload" quando a lição é um vídeo (tickets/049). */
  @Post(':id/video')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.uploadDemanda)
  async sendVideo(
    @Param('id') id: string,
    @Body() dto: SendVideoDto,
    @Req() req: Request,
  ) {
    return await this.contentService.sendVideo(
      id,
      (req.user as User).id,
      dto.url,
    );
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciadorDemanda)
  async delete(@Param('id') id: string) {
    return await this.contentService.delete(id);
  }

  /**
   * ⚠️ Só JWT, sem permissão de demanda: é por aqui que o ALUNO lê o
   * material na página do tema. Estava sem guard nenhum — o id do
   * `FileContent` aparece para qualquer logado em `/content/order`, e o link
   * baixava o arquivo sem login.
   */
  @Get('file/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getFile(@Param('id') id: string) {
    return await this.contentService.getFile(id);
  }

  /**
   * ⚠️ **Público, de propósito.** A home (sem login) mostra o total de
   * conteúdos aprovados (`client/services/public/impactStats`). Com o guard,
   * o visitante levava 401, o client tentava renovar a sessão, mandava para
   * `/logoff`, que volta para a home — e a tela ficava trocando sem parar.
   * Só devolve contagens, nada do material.
   */
  @Get('summary')
  async getSummary() {
    return await this.contentService.getSummary();
  }

  // As duas estatísticas abaixo só são lidas pelo painel logado
  // (`client/pages/analytics/content`).
  @Get('stats-by-frente')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obter estatísticas de conteúdos agrupadas por frente',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getStatsByFrente() {
    return await this.contentService.getStatsByFrente();
  }

  @Get('snapshot-content-status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obter snapshot de estatísticas de conteúdos',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getSnapshotContentStatus() {
    return await this.contentService.getSnapshotContentStatus();
  }

  @Post(':id/proposal')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.uploadDemanda)
  @UseInterceptors(FileInterceptor('file', docxUploadOptions))
  async uploadProposal(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('comment') comment: string | undefined,
    // Vídeo: o client manda `url` no mesmo FormData, sem `file`.
    @Body('url') url: string | undefined,
    @Req() req: Request,
  ) {
    return await this.contentService.uploadProposal(
      id,
      (req.user as User).id,
      file,
      comment,
      url,
    );
  }

  @Get(':id/proposals')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getProposals(@Param('id') id: string) {
    return await this.contentService.getProposalsByContent(id);
  }

  @Patch('proposal/:id/review')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarDemanda)
  async reviewProposal(
    @Param('id') id: string,
    @Body() dto: ReviewProposalDto,
    @Req() req: Request,
  ) {
    return await this.contentService.reviewProposal(
      id,
      dto.status,
      (req.user as User).id,
    );
  }

  /** Tudo que aconteceu com a demanda, em ordem, com quem e quando (050/02). */
  @Get(':id/timeline')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getTimeline(@Param('id') id: string) {
    return await this.contentService.getTimeline(id);
  }

  @Get(':id/file-history')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getFileHistory(@Param('id') id: string) {
    return await this.contentService.getFileHistory(id);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarDemanda)
  async getById(@Param('id') id: string) {
    return await this.contentService.getById(id);
  }
}
