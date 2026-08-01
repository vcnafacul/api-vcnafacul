import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permission.guard';
import { Permissions } from '../role/permissions/permissions';
import { EssayThemeService } from './essay-theme.service';
import { EssayService } from './essay.service';
import { EssaySettingsService } from './essay-settings.service';
import { CreateEssayThemeDto } from './dtos/create-essay-theme.dto';
import { UpdateEssayThemeDto } from './dtos/update-essay-theme.dto';
import { CreateEssayDto } from './dtos/create-essay.dto';
import { SubmitEssayDto } from './dtos/submit-essay.dto';
import { SubmitEssayImageDto } from './dtos/submit-essay-image.dto';
import { CreateEssayReviewDto } from './dtos/create-essay-review.dto';

@ApiTags('Essay')
@Controller('essay')
export class EssayController {
  constructor(
    private readonly themeService: EssayThemeService,
    private readonly essayService: EssayService,
    private readonly settingsService: EssaySettingsService,
  ) {}

  // ---- Settings endpoints ----

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTemas)
  updateSettings(@Body() body: { aiEnabled: boolean }) {
    return this.settingsService.updateSettings({ aiEnabled: body.aiEnabled });
  }

  // ---- Theme endpoints ----

  @Post('theme')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTemas)
  createTheme(@Body() dto: CreateEssayThemeDto, @Req() req: any) {
    return this.themeService.create(dto, req.user.id);
  }

  @Get('theme/current')
  @UseGuards(JwtAuthGuard)
  getCurrentTheme() {
    return this.themeService.findCurrent();
  }

  @Get('theme/available')
  @UseGuards(JwtAuthGuard)
  getAvailableThemes(@Req() req: any) {
    return this.themeService.findAvailable(req.user.id);
  }

  @Get('theme')
  @UseGuards(JwtAuthGuard)
  listThemes(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.themeService.findAll(+page, +limit);
  }

  @Get('theme/:id')
  @UseGuards(JwtAuthGuard)
  getTheme(@Param('id') id: string) {
    return this.themeService.findById(id);
  }

  @Patch('theme/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTemas)
  updateTheme(@Param('id') id: string, @Body() dto: UpdateEssayThemeDto) {
    return this.themeService.update(id, dto);
  }

  @Delete('theme/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTemas)
  deleteTheme(@Param('id') id: string) {
    return this.themeService.remove(id);
  }

  // ---- Essay endpoints ----

  @Post()
  @UseGuards(JwtAuthGuard)
  createEssay(@Body() dto: CreateEssayDto, @Req() req: any) {
    return this.essayService.create(dto, req.user.id);
  }

  @Post('submit-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  submitImage(
    @Body() dto: SubmitEssayImageDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.essayService.submitImage(dto.themeId, file, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateDraft(
    @Param('id') id: string,
    @Body() dto: CreateEssayDto,
    @Req() req: any,
  ) {
    return this.essayService.updateDraft(id, dto, req.user.id);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  submitEssay(
    @Param('id') id: string,
    @Body() dto: SubmitEssayDto,
    @Req() req: any,
  ) {
    return this.essayService.submit(id, dto, req.user.id);
  }

  @Get(':id/image')
  @UseGuards(JwtAuthGuard)
  async getImage(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } = await this.essayService.getImage(
      id,
      req.user.id,
    );
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  myEssays(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.essayService.findMyEssays(req.user.id, +page, +limit);
  }

  @Get('my/stats')
  @UseGuards(JwtAuthGuard)
  async myStats(@Req() req: { user: { id: string } }) {
    return this.essayService.getMyStats(req.user.id);
  }

  // ---- Review endpoints ----

  @Get('all/count')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.revisarTodasRedacoes)
  async getAllEssayCount() {
    return this.essayService.countAllSubmitted();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.revisarTodasRedacoes)
  getAllEssays(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('themeId') themeId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.essayService.findAllEssays(+page, +limit, {
      themeId,
      status,
      search,
    });
  }

  @Get('my-cursinho/count')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.revisarRedacoes)
  async getMyCursinhoEssayCount(@Req() req: any) {
    return this.essayService.countSubmittedForCollaborator(req.user.id);
  }

  @Get('my-cursinho')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.revisarRedacoes)
  getMyCursinhoEssays(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('themeId') themeId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.essayService.findEssaysForCollaborator(
      req.user.id,
      +page,
      +limit,
      {
        themeId,
        status,
        search,
      },
    );
  }

  @Get('prep-course/:prepCourseId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.revisarRedacoes)
  async getPrepCourseEssays(
    @Param('prepCourseId') prepCourseId: string,
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('themeId') themeId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    await this.essayService.validatePrepCourseAccess(prepCourseId, req.user.id);
    return this.essayService.findEssaysByPrepCourse(
      prepCourseId,
      +page,
      +limit,
      { themeId, status, search },
    );
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.revisarRedacoes)
  async createReview(
    @Param('id') id: string,
    @Body() dto: CreateEssayReviewDto,
    @Req() req: any,
  ) {
    await this.essayService.validateReviewerScope(id, req.user.id);
    return this.essayService.createHumanReview(id, req.user.id, dto);
  }

  @Get(':id/reviews')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.revisarRedacoes)
  async getReviews(@Param('id') id: string, @Req() req: any) {
    await this.essayService.validateReviewerScope(id, req.user.id);
    return this.essayService.findReviewsByEssayId(id);
  }

  @Get(':id')
  // Aluno visualiza a própria redação (findById filtra por dono);
  // revisor/admin são autorizados por validateReviewerScope no service
  @UseGuards(JwtAuthGuard)
  async getEssay(@Param('id') id: string, @Req() req: any) {
    try {
      return await this.essayService.findById(id, req.user.id);
    } catch {
      await this.essayService.validateReviewerScope(id, req.user.id);
      return this.essayService.findByIdForReviewer(id);
    }
  }
}
