import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class ChangeOrderDTOInput {
  @ApiProperty()
  @IsNumber()
  listId: number;

  @ApiProperty()
  @IsNumber()
  node1: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  node2?: number;
}
