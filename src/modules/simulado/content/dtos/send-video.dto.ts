import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendVideoDto {
  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url: string;
}
