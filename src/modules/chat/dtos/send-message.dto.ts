import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @ApiProperty()
  conversationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @ApiProperty({
    description: 'Mensagem (≤ 1000 chars, sanitizada server-side)',
  })
  content: string;
}
