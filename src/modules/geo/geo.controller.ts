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
import { GeoService } from './geo.service';
import { ListGeoDTOInput } from './dto/list-geo.dto.input';
import { CreateGeoDTOInput } from './dto/create-geo.dto.input';
import { Request, Response } from 'express';
import { UpdateGeoDTOInput } from './dto/update-geo.dto.input';
import { GeoStatusChangeDTOInput } from './dto/geo-status.dto.input';
import { User } from '../user/user.entity';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';

@ApiTags('Geolocation')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Post()
  async createGeo(@Body() createGeoDTO: CreateGeoDTOInput) {
    return await this.geoService.create(createGeoDTO);
  }

  @Get()
  async findAllByFilter(@Query() filterDto: ListGeoDTOInput) {
    return await this.geoService.findAllByFilter(filterDto);
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
}
