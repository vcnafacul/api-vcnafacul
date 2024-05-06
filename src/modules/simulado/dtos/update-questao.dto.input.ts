import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateQuestaoDTOInput } from './create-questao.dto.input';

export class UpdateDTOInput extends PartialType(CreateQuestaoDTOInput) {
  @IsString()
  @ApiProperty()
  _id: number;

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  public provaClassification: boolean = false;

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  public reported: boolean = false;
}
