import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateHomeSupporterDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty()
  name: string;

  @IsUrl({ require_tld: false })
  @MaxLength(512)
  @ApiProperty()
  link: string;
}
