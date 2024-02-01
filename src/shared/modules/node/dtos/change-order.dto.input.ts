import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';
import { InsertWhere } from 'src/modules/contents/content/enum/insert-where';

export class ChangeOrderDTOInput {
  @ApiProperty()
  @IsNumber()
  listId: number;

  @ApiProperty()
  @IsNumber()
  node1: number;

  @ApiProperty()
  @IsNumber()
  node2?: number;

  @ApiProperty()
  @IsEnum(InsertWhere)
  where?: number;
}
