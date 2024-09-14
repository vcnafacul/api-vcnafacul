import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { InsertWhere } from 'src/modules/contents/content/enum/insert-where';

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

  @ApiProperty()
  @IsEnum(InsertWhere)
  where?: number;
}
