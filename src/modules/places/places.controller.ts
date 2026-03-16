import {
  BadRequestException,
  Controller,
  Get,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import { GetGoogleApiDetailsDTOInput } from './dto/get-google-api-info.dto.input';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { GetGoogleApiDetailsDTOOutput } from './dto/get-google-api-details.dto.output';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('details')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarCursinho)
  async details(
    @Query() params: GetGoogleApiDetailsDTOInput,
  ): Promise<GetGoogleApiDetailsDTOOutput> {
    const placeId = params?.placeId?.trim();

    if (!placeId) {
      throw new BadRequestException('`placeId` query param is required.');
    }

    return this.placesService.placeDetails(placeId);
  }
}
