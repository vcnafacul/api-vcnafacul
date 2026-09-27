import { ApiProperty } from '@nestjs/swagger';
import { TypeGeo } from '../enum/typeGeo';
import { Geolocation } from '../geo.entity';

/**
 * ⚠️ **Lista BRANCA dos campos públicos de um cursinho/universidade.** O
 * `GET /geo` devolvia a entidade inteira: `user*` (quem cadastrou), `logs`
 * com dados de quem validou, `report*` e `status`. Coluna nova na entidade NÃO
 * aparece aqui sozinha — o e2e compara as chaves e obriga a decidir.
 */
export const CAMPOS_PUBLICOS_GEO = [
  'id',
  'type',
  'name',
  'alias',
  'campus',
  'category',
  'latitude',
  'longitude',
  'cep',
  'state',
  'city',
  'neighborhood',
  'street',
  'number',
  'complement',
  'phone',
  'whatsapp',
  'email',
  'email2',
  'site',
  'linkedin',
  'youtube',
  'facebook',
  'instagram',
  'twitter',
  'tiktok',
  'createdAt',
  'updatedAt',
] as const;

export type CampoPublicoGeo = (typeof CAMPOS_PUBLICOS_GEO)[number];

export class PublicGeoDtoOutput {
  @ApiProperty() id: string;
  @ApiProperty({ enum: TypeGeo }) type: TypeGeo;
  @ApiProperty() name: string;
  @ApiProperty({ required: false }) alias?: string;
  @ApiProperty({ required: false }) campus?: string;
  @ApiProperty({ required: false }) category?: string;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiProperty() cep: string;
  @ApiProperty() state: string;
  @ApiProperty() city: string;
  @ApiProperty() neighborhood: string;
  @ApiProperty() street: string;
  @ApiProperty({ required: false }) number?: string;
  @ApiProperty({ required: false }) complement?: string;
  @ApiProperty({ required: false }) phone?: string;
  @ApiProperty({ required: false }) whatsapp?: string;
  @ApiProperty({ required: false }) email?: string;
  @ApiProperty({ required: false }) email2?: string;
  @ApiProperty({ required: false }) site?: string;
  @ApiProperty({ required: false }) linkedin?: string;
  @ApiProperty({ required: false }) youtube?: string;
  @ApiProperty({ required: false }) facebook?: string;
  @ApiProperty({ required: false }) instagram?: string;
  @ApiProperty({ required: false }) twitter?: string;
  @ApiProperty({ required: false }) tiktok?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

/** Copia só os campos da lista branca — nunca espalha a entidade. */
export function paraGeoPublico(geo: Geolocation): PublicGeoDtoOutput {
  const saida = {} as Record<CampoPublicoGeo, unknown>;
  for (const campo of CAMPOS_PUBLICOS_GEO) {
    saida[campo] = (geo as unknown as Record<string, unknown>)[campo] ?? null;
  }
  return saida as unknown as PublicGeoDtoOutput;
}
