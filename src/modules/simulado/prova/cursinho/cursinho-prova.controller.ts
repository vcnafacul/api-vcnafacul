import {
  Body,
  Controller,
  Get,
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
import { CreateProvaDTOInput } from '../dtos/prova-create.dto.input';
import { ProvaService } from '../prova.service';
import { CursinhoResolverService } from './cursinho-resolver.service';

@ApiTags('Simulado - Prova Cursinho')
@Controller('mssimulado/cursinho/prova')
export class CursinhoProvaController {
  constructor(
    private readonly provaService: ProvaService,
    private readonly cursinhoResolver: CursinhoResolverService,
  ) {}

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
