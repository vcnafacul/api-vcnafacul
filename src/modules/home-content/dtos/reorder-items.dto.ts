import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderItemDto {
  @IsInt()
  @ApiProperty()
  id: number;

  @IsInt()
  @Min(0)
  @ApiProperty()
  order: number;
}

export class ReorderItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  @ApiProperty({ type: [ReorderItemDto] })
  items: ReorderItemDto[];
}
