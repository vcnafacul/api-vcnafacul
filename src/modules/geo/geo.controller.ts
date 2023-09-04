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
  UseGuards,
} from '@nestjs/common';
import { GeoService } from './geo.service';
import { ListGeoDTOInput } from './dto/list-geo.dto.input';
import { CreateGeoDTOInput } from './dto/create-geo.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { UpdateGeoDTOInput } from './dto/update-geo.dto.input';
import { GeoStatusChangeDTOInput } from './dto/geo-status.dto.input';
import { User } from '../user/user.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

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
  @UseGuards(JwtAuthGuard)
  async updateGeo(
    @Body() updateDto: UpdateGeoDTOInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log(`put`);
    if (await this.geoService.updateGeo(updateDto, req.user as User)) {
      return res.status(HttpStatus.OK).send('Updated successfully');
    }
    return res.status(HttpStatus.NOT_MODIFIED).send('Not updated');
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
