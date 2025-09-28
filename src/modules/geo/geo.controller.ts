import {
  Body,
  Controller,
  Get,
  HttpStatus,
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
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { User } from '../user/user.entity';
import { CreateGeoDTOInput } from './dto/create-geo.dto.input';
import { GeoStatusChangeDTOInput } from './dto/geo-status.dto.input';
import { ListGeoDTOInput } from './dto/list-geo.dto.input';
import { ReportMapHome } from './dto/report-map-home';
import { UpdateGeoDTOInput } from './dto/update-geo.dto.input';
import { Geolocation } from './geo.entity';
import { GeoService } from './geo.service';

@ApiTags('Geolocation')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Post()
  async createGeo(@Body() createGeoDTO: CreateGeoDTOInput) {
    return await this.geoService.create(createGeoDTO);
  }

  @Get()
  async findAllByFilter(
    @Query() filterDto: ListGeoDTOInput,
  ): Promise<GetAllDtoOutput<Geolocation>> {
    return await this.geoService.findAllByFilter(filterDto);
  }

  @Get('summary-status')
  async getCountGeoByTypeUniversity() {
    return await this.geoService.getTotalEntityByTypeAndStatus();
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
}
