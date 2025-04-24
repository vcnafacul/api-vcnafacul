import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeOrderDTOInput {
  @ApiProperty()
  @IsString()
  listId: string;

  @ApiProperty()
  @IsString()
  node1: string;

  @ApiProperty()
  @IsString()
  node2?: string;
}
