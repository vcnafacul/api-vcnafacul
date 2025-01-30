import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class CollaboratorVolunteerDtoOutput {
  @IsString()
  @ApiProperty()
  image: string;

  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
  description: string;

  @IsBoolean()
  @ApiProperty()
  actived: boolean;
}
