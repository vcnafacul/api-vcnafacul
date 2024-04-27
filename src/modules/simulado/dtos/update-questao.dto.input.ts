import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import { CreateQuestaoDTOInput } from './create-questao.dto.input';

export class UpdateDTOInput extends PartialType(CreateQuestaoDTOInput) {
  @IsString()
  @ApiProperty()
  _id: number;

  @IsBoolean()
  @ApiProperty()
  public provaClassification: boolean;

  @IsBoolean()
  @ApiProperty()
  public reported: boolean;
}
