import { of } from 'rxjs';
import { PlacesService } from './places.service';
import { HttpService } from '@nestjs/axios';
import { EnvService } from 'src/shared/modules/env/env.service';
import { PlaceNewDetailsResponse } from './types/placeNewDetailsResponse';

describe('PlacesService', () => {
  let service: PlacesService;
  let http: jest.Mocked<HttpService>;
  let envService: jest.Mocked<EnvService>;

  beforeEach(() => {
    http = { get: jest.fn() } as any;
    envService = { get: jest.fn().mockReturnValue('fake-api-key') } as any;
    service = new PlacesService(http, envService);
  });

  const makePlaceResponse = (
    overrides: Partial<PlaceNewDetailsResponse> = {},
  ): PlaceNewDetailsResponse => ({
    id: 'place-123',
    displayName: { text: 'Test Place' },
    primaryType: 'university',
    formattedAddress: 'Rua A, 123, São Paulo',
    nationalPhoneNumber: '(11) 9999-0000',
    websiteUri: 'https://example.com',
    location: { latitude: -23.5, longitude: -46.6 },
    addressComponents: [
      { longText: '01000-000', types: ['postal_code'] },
      { longText: 'Rua A', types: ['route'] },
      { longText: '123', types: ['street_number'] },
      { longText: 'Centro', types: ['neighborhood'] },
      { longText: 'São Paulo', types: ['locality'] },
      {
        longText: 'São Paulo',
        shortText: 'SP',
        types: ['administrative_area_level_1'],
      },
    ],
    ...overrides,
  });

  describe('placeDetails', () => {
    it('should call Google API and return mapped DTO', async () => {
      const place = makePlaceResponse();
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('place-123');

      expect(http.get).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places/place-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Goog-Api-Key': 'fake-api-key',
          }),
        }),
      );
      expect(result.placeId).toBe('place-123');
      expect(result.name).toBe('Test Place');
      expect(result.category).toBe('university');
      expect(result.cep).toBe('01000-000');
      expect(result.street).toBe('Rua A');
      expect(result.number).toBe('123');
      expect(result.neighborhood).toBe('Centro');
      expect(result.city).toBe('São Paulo');
      expect(result.state).toBe('SP');
      expect(result.phone).toBe('(11) 9999-0000');
      expect(result.lat).toBe(-23.5);
      expect(result.lng).toBe(-46.6);
    });
  });

  describe('mapToDto fallbacks', () => {
    it('should use sublocality when neighborhood is missing', async () => {
      const place = makePlaceResponse({
        addressComponents: [
          { longText: 'Liberdade', types: ['sublocality'] },
          { longText: 'São Paulo', types: ['locality'] },
        ],
      });
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('p1');
      expect(result.neighborhood).toBe('Liberdade');
    });

    it('should use sublocality_level_1 as last neighborhood fallback', async () => {
      const place = makePlaceResponse({
        addressComponents: [
          { longText: 'Vila Mariana', types: ['sublocality_level_1'] },
        ],
      });
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('p1');
      expect(result.neighborhood).toBe('Vila Mariana');
    });

    it('should use administrative_area_level_2 when locality is missing', async () => {
      const place = makePlaceResponse({
        addressComponents: [
          { longText: 'Campinas', types: ['administrative_area_level_2'] },
        ],
      });
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('p1');
      expect(result.city).toBe('Campinas');
    });

    it('should use longText for state when shortText is missing', async () => {
      const place = makePlaceResponse({
        addressComponents: [
          {
            longText: 'São Paulo',
            types: ['administrative_area_level_1'],
          },
        ],
      });
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('p1');
      expect(result.state).toBe('São Paulo');
    });

    it('should use types[0] when primaryType is missing', async () => {
      const place = makePlaceResponse({
        primaryType: undefined,
        types: ['school'],
      });
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('p1');
      expect(result.category).toBe('school');
    });

    it('should use shortFormattedAddress when formattedAddress is missing', async () => {
      const place = makePlaceResponse({
        formattedAddress: undefined,
        shortFormattedAddress: 'Rua A, 123',
      });
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('p1');
      expect(result.formattedAddress).toBe('Rua A, 123');
    });

    it('should use internationalPhoneNumber when national is missing', async () => {
      const place = makePlaceResponse({
        nationalPhoneNumber: undefined,
        internationalPhoneNumber: '+55 11 9999-0000',
      });
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('p1');
      expect(result.phone).toBe('+55 11 9999-0000');
    });

    it('should handle empty addressComponents', async () => {
      const place = makePlaceResponse({
        addressComponents: [],
      });
      http.get.mockReturnValue(of({ data: place } as any));

      const result = await service.placeDetails('p1');
      expect(result.cep).toBeUndefined();
      expect(result.street).toBeUndefined();
      expect(result.neighborhood).toBeUndefined();
      expect(result.city).toBeUndefined();
      expect(result.state).toBeUndefined();
    });
  });
});
