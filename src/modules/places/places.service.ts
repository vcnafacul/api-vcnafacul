import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EnvService } from 'src/shared/modules/env/env.service';
import { PlaceNewDetailsResponse } from './types/placeNewDetailsResponse';
import { GetGoogleApiDetailsDTOOutput } from './dto/get-google-api-details.dto.output';
import { PlacesAddressComponent } from './types/placesAddressComponent';

@Injectable()
export class PlacesService {
  constructor(
    private readonly http: HttpService,
    private readonly envService: EnvService,
  ) {}

  async placeDetails(placeId: string): Promise<GetGoogleApiDetailsDTOOutput> {
    const url = `https://places.googleapis.com/v1/places/${placeId}`;

    const fieldMask = [
      'id',
      'displayName',
      'primaryType',
      'types',
      'formattedAddress',
      'shortFormattedAddress',
      'addressComponents',
      'nationalPhoneNumber',
      'internationalPhoneNumber',
      'websiteUri',
      'location',
    ].join(',');

    const res = await firstValueFrom(
      this.http.get<PlaceNewDetailsResponse>(url, {
        headers: {
          'X-Goog-Api-Key': this.envService.get('GOOGLE_MAPS_API_KEY'),
          'X-Goog-FieldMask': fieldMask,
        },
      }),
    );

    return this.mapToDto(res.data);
  }

  private pick(
    components: PlacesAddressComponent[] | undefined,
    type: string,
  ): PlacesAddressComponent | undefined {
    return components?.find((c) => c.types?.includes(type));
  }

  private mapToDto(
    place: PlaceNewDetailsResponse,
  ): GetGoogleApiDetailsDTOOutput {
    const comps = place.addressComponents ?? [];

    const cep = this.pick(comps, 'postal_code')?.longText;

    const street = this.pick(comps, 'route')?.longText;
    const number = this.pick(comps, 'street_number')?.longText;

    const neighborhood =
      this.pick(comps, 'neighborhood')?.longText ??
      this.pick(comps, 'sublocality')?.longText ??
      this.pick(comps, 'sublocality_level_1')?.longText;

    const city =
      this.pick(comps, 'locality')?.longText ??
      this.pick(comps, 'administrative_area_level_2')?.longText;

    const state =
      this.pick(comps, 'administrative_area_level_1')?.shortText ??
      this.pick(comps, 'administrative_area_level_1')?.longText;

    return {
      placeId: place.id,
      name: place.displayName?.text,
      category: place.primaryType ?? place.types?.[0],
      cep,
      street,
      number,
      complement: this.pick(comps, 'subpremise')?.longText,
      neighborhood,
      city,
      state,
      phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
      site: place.websiteUri,
      formattedAddress: place.formattedAddress ?? place.shortFormattedAddress,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    };
  }
}
