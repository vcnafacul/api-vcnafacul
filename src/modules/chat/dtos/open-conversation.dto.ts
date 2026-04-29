import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ConversationMetadataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty()
  page: string;

  @IsString()
  @MaxLength(500)
  @ApiProperty()
  userAgent: string;

  @IsIn(['mobile', 'desktop'])
  @ApiProperty({ enum: ['mobile', 'desktop'] })
  device: 'mobile' | 'desktop';

  @IsString()
  @MaxLength(100)
  @ApiProperty()
  browser: string;
}

export class OpenConversationDto {
  @ValidateNested()
  @Type(() => ConversationMetadataDto)
  @ApiProperty({ type: ConversationMetadataDto })
  metadata: ConversationMetadataDto;
}
