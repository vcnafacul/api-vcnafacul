import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class inviteMembersInputDto {
  @ApiProperty()
  @IsString({ message: 'O email deve ser uma string' })
  email: string;
}
