import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LINKS_MAX, QUEM_SOMOS_MAX } from '../regras-da-pagina';

export class LinkDaPaginaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Todo link precisa de um título.' })
  @MaxLength(100)
  titulo: string;

  @ApiProperty()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    {
      message:
        'Link inválido: use um endereço que comece com http:// ou https://.',
    },
  )
  @MaxLength(500)
  url: string;
}

export class SalvarPaginaDtoInput {
  /** Formato e unicidade são checados no service (mensagens próprias). */
  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(QUEM_SOMOS_MAX)
  quemSomos?: string | null;

  @ApiProperty()
  @IsBoolean()
  active: boolean;

  @ApiProperty({ type: [LinkDaPaginaDto] })
  @IsArray()
  @ArrayMaxSize(LINKS_MAX)
  @ValidateNested({ each: true })
  @Type(() => LinkDaPaginaDto)
  linksPublicos: LinkDaPaginaDto[];

  @ApiProperty({ type: [LinkDaPaginaDto] })
  @IsArray()
  @ArrayMaxSize(LINKS_MAX)
  @ValidateNested({ each: true })
  @Type(() => LinkDaPaginaDto)
  linksInternos: LinkDaPaginaDto[];
}
