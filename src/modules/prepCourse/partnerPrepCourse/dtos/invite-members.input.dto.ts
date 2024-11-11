import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class inviteMembersInputDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  email: string;
}
