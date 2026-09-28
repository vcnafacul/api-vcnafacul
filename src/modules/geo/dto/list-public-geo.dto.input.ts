import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { TypeGeo } from '../enum/typeGeo';

/**
 * Filtro do `GET /geo/public`. ⚠️ Não tem `status`: é sempre aprovado, e um
 * `?status=` na query é ignorado (o `whitelist` do ValidationPipe o descarta).
 */
export class ListPublicGeoDtoInput {
  @ApiProperty({ enum: TypeGeo, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(TypeGeo)
  type?: TypeGeo;
}
