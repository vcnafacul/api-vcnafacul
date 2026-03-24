import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitEssayImageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  themeId: string;
}
