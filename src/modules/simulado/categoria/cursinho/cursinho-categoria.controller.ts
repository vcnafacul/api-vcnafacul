import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CursinhoResolverService } from '../../prova/cursinho/cursinho-resolver.service';
import { CategoriaProxyService } from '../categoria.service';
import { CreateCategoriaDtoInput } from '../dtos/create-categoria.dto.input';

/**
 * Categorias de um cursinho.
 *
 * ⚠️ **O dono vem SEMPRE do JWT, nunca do corpo.** Mesma regra que o
 * `cursinho-prova.controller` já aplica a `criadorId`/`cursinhoId`, e pelo mesmo
 * motivo: o cliente não decide de quem é o registro.
 */
@ApiTags('Simulado - Categoria Cursinho')
@Controller('mssimulado/cursinho/categoria')
export class CursinhoCategoriaController {
  constructor(
    private readonly categoriaService: CategoriaProxyService,
    private readonly cursinhoResolver: CursinhoResolverService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'lista categorias do cursinho' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvasCursinho)
  async getAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const cursinhoId = await this.cursinhoResolver.resolveCursinhoIdByUserId(
      (req.user as User).id,
    );
    return await this.categoriaService.getAll(page, limit, cursinhoId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'cria categoria do cursinho' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarCategoriasCursinho)
  async create(@Body() dto: CreateCategoriaDtoInput, @Req() req: Request) {
    const cursinhoId = await this.cursinhoResolver.resolveCursinhoIdByUserId(
      (req.user as User).id,
    );
    return await this.categoriaService.create(dto, cursinhoId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'exclui categoria do cursinho' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarCategoriasCursinho)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const cursinhoId = await this.cursinhoResolver.resolveCursinhoIdByUserId(
      (req.user as User).id,
    );
    return await this.categoriaService.delete(id, cursinhoId);
  }
}
