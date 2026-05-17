import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsNotEmpty()
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

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  inscriptionCourseId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  studentCourseId?: string;
}
