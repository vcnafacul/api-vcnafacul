import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  SetMetadata,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { AtorService } from '../../ator/ator.service';
import { DuplicarProvaDtoInput } from '../dtos/duplicar-prova.dto.input';
import { CreateProvaDTOInput } from '../dtos/prova-create.dto.input';
import { ProvaService } from '../prova.service';
import { CursinhoResolverService } from './cursinho-resolver.service';

@ApiTags('Simulado - Prova Cursinho')
@Controller('mssimulado/cursinho/prova')
export class CursinhoProvaController {
  constructor(
    private readonly provaService: ProvaService,
    private readonly cursinhoResolver: CursinhoResolverService,
    private readonly atorService: AtorService,
  ) {}

  /**
   * Duplica a prova do cursinho (tickets/027) — ex.: "Simulado Inglês" →
   * "Simulado Espanhol", com as mesmas questões. O ms decide pelo ator (só
   * prova do próprio cursinho); 403/409 chegam com a mensagem dele.
   */
  @Post(':id/duplicar')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'duplica a prova do cursinho' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvasCursinho)
  public async duplicar(
    @Param('id') id: string,
    @Body() dto: DuplicarProvaDtoInput,
    @Req() req: Request,
  ) {
    return await this.provaService.duplicar(
      id,
      dto.nome.trim(),
      await this.atorService.resolver((req.user as User).id),
    );
  }

  @Get()
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'lista provas do cursinho' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvasCursinho)
  public async getAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: Request,
  ) {
    const cursinhoId = await this.cursinhoResolver.resolveCursinhoIdByUserId(
      (req.user as User).id,
    );
    return await this.provaService.getAllByCursinho(cursinhoId, page, limit);
  }

  @Post()
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'cria prova do cursinho' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvasCursinho)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gabarito', maxCount: 1 },
    ]),
  )
  public async create(
    @Body() dto: CreateProvaDTOInput,
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; gabarito?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    const userId = (req.user as User).id;
    const cursinhoId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(userId);
    return await this.provaService.createProva(
      dto,
      files?.file?.[0],
      files?.gabarito?.[0],
      userId,
      cursinhoId,
    );
  }
}
