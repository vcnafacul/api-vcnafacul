import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetGoogleApiDetailsDTOOutput {
  @ApiPropertyOptional({ description: 'Place ID retornado pelo Google Places' })
  placeId?: string;

  @ApiPropertyOptional({
    description: 'Nome do local',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Categoria/tipo principal do local',
  })
  category?: string;

  @ApiPropertyOptional({ description: 'CEP' })
  cep?: string;

  @ApiPropertyOptional({ description: 'Logradouro' })
  street?: string;

  @ApiPropertyOptional({
    description: 'Número',
  })
  number?: string;

  @ApiPropertyOptional({
    description: 'Complemento',
  })
  complement?: string;

  @ApiPropertyOptional({
    description: 'Bairro',
  })
  neighborhood?: string;

  @ApiPropertyOptional({
    description: 'Município/cidade',
  })
  city?: string;

  @ApiPropertyOptional({
    description: 'Estado/UF',
  })
  state?: string;

  @ApiPropertyOptional({
    description: 'Telefone',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Site',
  })
  site?: string;

  @ApiPropertyOptional({
    description: 'Endereço completo formatado',
  })
  formattedAddress?: string;

  @ApiPropertyOptional({ description: 'Latitude do local' })
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude do local' })
  lng?: number;
}
