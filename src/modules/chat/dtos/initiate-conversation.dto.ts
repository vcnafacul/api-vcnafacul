import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class InitiateConversationDto {
  @IsUUID()
  @ApiProperty()
  targetUserId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @ApiProperty({ minLength: 1, maxLength: 1000 })
  content: string;
}
