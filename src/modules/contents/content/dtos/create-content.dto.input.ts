import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateContentDTOInput {
  @ApiProperty()
  @IsNumber()
  subjectId: string; //precisa verificar se o subject existe

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;
}
