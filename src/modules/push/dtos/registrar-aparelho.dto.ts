import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PlataformaDoAparelho } from '../push-device.entity';

export class RegistrarAparelhoDtoInput {
  @ApiProperty({ description: 'Token do FCM (getToken do client)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;

  @ApiProperty({ enum: PlataformaDoAparelho, required: false })
  @IsOptional()
  @IsEnum(PlataformaDoAparelho)
  platform?: PlataformaDoAparelho;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  standalone?: boolean;

  /** Cortado em 512 em vez de recusado: é só para exibir e depurar. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.slice(0, 512) : value,
  )
  userAgent?: string;
}

export class RemoverAparelhoDtoInput {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;
}
