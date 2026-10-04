import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Patch,
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
import { EditarDadosProvaDtoInput } from '../dtos/editar-dados-prova.dto.input';
import { CreateProvaDTOInput } from '../dtos/prova-create.dto.input';
import { ProvaService } from '../prova.service';
import { CursinhoResolverService } from './cursinho-resolver.service';
import { ProvaNosEventosRepository } from './prova-nos-eventos.repository';

@ApiTags('Simulado - Prova Cursinho')
@Controller('mssimulado/cursinho/prova')
export class CursinhoProvaController {
  constructor(
    private readonly provaService: ProvaService,
    private readonly cursinhoResolver: CursinhoResolverService,
    private readonly atorService: AtorService,
    private readonly provaNosEventos: ProvaNosEventosRepository,
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

  /**
   * Card 41 — corrige nome, ano, edição, aplicação ou categoria da prova do
   * cursinho. As regras (dono, oficial, categoria só sem cartão) são do ms.
   *
   * ⚠️ O nome é COPIADO nos eventos de simulado: renomeia lá também, senão o
   * aluno escolhe a prova pelo nome antigo.
   */
  @Patch(':id')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'edita os dados da prova' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvasCursinho)
  public async editarDados(
    @Param('id') id: string,
    @Body() dto: EditarDadosProvaDtoInput,
    @Req() req: Request,
  ) {
    const r = await this.provaService.editarDados(
      id,
      { ...dto },
      await this.atorService.resolver((req.user as User).id),
    );
    if (dto.nome !== undefined) {
      await this.provaNosEventos.renomearProva(id, r.nome);
    }
    return r;
  }

  /**
   * Card 41 — exclui a prova do cursinho (lógico, no ms).
   *
   * ⚠️ Prova oferecida num evento de simulado → 409 com os eventos: o aluno
   * pode estar inscrito nela. Checado AQUI porque os eventos moram no MySQL.
   */
  @Delete(':id')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'exclui a prova do cursinho' })
  @ApiResponse({ status: 409, description: 'prova em evento ou já feita' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvasCursinho)
  public async excluir(@Param('id') id: string, @Req() req: Request) {
    const ator = await this.atorService.resolver((req.user as User).id);
    const eventos = await this.provaNosEventos.eventosComProva(id);
    if (eventos.length) {
      throw new ConflictException(
        `Não dá para excluir: a prova está no evento de simulado ${eventos
          .map((e) => `"${e}"`)
          .join(', ')}. Tire a prova do evento primeiro.`,
      );
    }
    return await this.provaService.excluir(id, ator);
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
