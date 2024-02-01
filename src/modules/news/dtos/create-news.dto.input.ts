import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateNewsDtoInput {
  @IsString()
  @ApiProperty()
  session: string;

  @IsString()
  @ApiProperty()
  title: string;
}
