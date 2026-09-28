import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/permissions/permissions';
import { User } from '../user/user.entity';
import { CreateGeoDTOInput } from './dto/create-geo.dto.input';
import { GeoStatusChangeDTOInput } from './dto/geo-status.dto.input';
import { ListGeoDTOInput } from './dto/list-geo.dto.input';
import { ReportMapHome } from './dto/report-map-home';
import { ListPublicGeoDtoInput } from './dto/list-public-geo.dto.input';
import { PublicGeoDtoOutput } from './dto/public-geo.dto.output';
import { SearchGeoDtoInput } from './dto/search-geo.input';
import { UpdateGeoDTOInput } from './dto/update-geo.dto.input';
import { Geolocation } from './geo.entity';
import { GeoService } from './geo.service';

/** Confirmar/desfazer: evita script alternando para inflar o contador. */
export const THROTTLE_CONFIRMACAO = { default: { ttl: 60000, limit: 30 } };

@ApiTags('Geolocation')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Post()
  async createGeo(@Body() createGeoDTO: CreateGeoDTOInput) {
    return await this.geoService.create(createGeoDTO);
  }

  /**
   * Cursinhos e universidades **aprovados**, só com os campos públicos (mapa da
   * home e busca). Sem auth e sem paginação: são poucas dezenas.
   */
  @Get('public')
  @ApiResponse({ status: 200, type: [PublicGeoDtoOutput] })
  async findPublic(
    @Query() { type }: ListPublicGeoDtoInput,
  ): Promise<PublicGeoDtoOutput[]> {
    return this.geoService.findPublic(type);
  }

  /** Dash: entidade completa, com dados pessoais e qualquer status. O mapa usa o `/public`. */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarCursinho)
  async findAllByFilter(
    @Query() filterDto: ListGeoDTOInput,
  ): Promise<GetAllDtoOutput<Geolocation>> {
    return await this.geoService.findAllByFilter(filterDto);
  }

  @Get('summary-status')
  async getCountGeoByTypeUniversity() {
    return await this.geoService.getTotalEntityByTypeAndStatus();
  }

  @Get('search-geo-by-name')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async searchGeoByName(@Query() query: SearchGeoDtoInput) {
    return await this.geoService.searchGeoByName(query.name);
  }

  @Put()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza informações de cursinhos',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarCursinho)
  async updateGeo(
    @Body() updateDto: UpdateGeoDTOInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (await this.geoService.updateGeo(updateDto, req.user as User)) {
      return res.status(HttpStatus.OK).send('Updated successfully');
    }
    return res.status(HttpStatus.NOT_MODIFIED).send('Not updated');
  }

  @Patch()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'atualiza status cursinho',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarCursinho)
  async validateGeo(
    @Body() geoStatus: GeoStatusChangeDTOInput,
    @Req() req: Request,
  ) {
    return await this.geoService.validateGeolocation(
      geoStatus,
      req.user as User,
    );
  }

  @Post('report-map-home')
  async reportMapHome(@Body() request: ReportMapHome) {
    return await this.geoService.reportMapHome(request);
  }

  // ─── "Informação correta" (tickets/022, card 03) ─────────────────────────
  // ⚠️ Sem colisão literal × :param: o geo não tem `GET /:id`, e as rotas com
  // `:id` aqui têm dois segmentos (o `report-map-home` tem um).

  @Get('confirmation/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'ids dos cursinhos que eu confirmei (válidas)',
    type: [String],
  })
  async minhasConfirmacoes(@Req() req: Request): Promise<string[]> {
    return this.geoService.minhasConfirmacoes((req.user as User).id);
  }

  @Post(':id/confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(THROTTLE_CONFIRMACAO)
  @ApiResponse({ status: 404, description: 'Não existe ou não está aprovado' })
  async confirmar(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.geoService.confirmarInformacao(id, (req.user as User).id);
  }

  @Delete(':id/confirmation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(THROTTLE_CONFIRMACAO)
  async desfazer(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.geoService.desfazerConfirmacao(id, (req.user as User).id);
  }
}
