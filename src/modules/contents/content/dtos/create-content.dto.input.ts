import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateContentDTOInput {
  @ApiProperty()
  @IsString()
  subjectId: string; //precisa verificar se o subject existe

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;
}
