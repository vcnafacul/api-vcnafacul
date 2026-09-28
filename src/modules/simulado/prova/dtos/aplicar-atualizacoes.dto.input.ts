import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  ValidateNested,
} from 'class-validator';

export class TrocaDeVersaoDTOInput {
  @ApiProperty()
  @IsMongoId()
  de: string;

  @ApiProperty()
  @IsMongoId()
  para: string;
}

/** tickets/023, card 14. */
export class AplicarAtualizacoesDTOInput {
  @ApiProperty({ type: [TrocaDeVersaoDTOInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TrocaDeVersaoDTOInput)
  trocas: TrocaDeVersaoDTOInput[];
}
