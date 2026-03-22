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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { EssayThemeService } from './essay-theme.service';
import { EssayService } from './essay.service';
import { EssaySettingsService } from './essay-settings.service';
import { CreateEssayThemeDto } from './dtos/create-essay-theme.dto';
import { UpdateEssayThemeDto } from './dtos/update-essay-theme.dto';
import { CreateEssayDto } from './dtos/create-essay.dto';
import { SubmitEssayDto } from './dtos/submit-essay.dto';

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

  @Get('my')
  @UseGuards(JwtAuthGuard)
  myEssays(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.essayService.findMyEssays(req.user.id, +page, +limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getEssay(@Param('id') id: string, @Req() req: any) {
    return this.essayService.findById(id, req.user.id);
  }
}
