import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { UserExist } from '../validator/user-exist.validator';

export class CollaboratorDtoInput {
  @IsString()
  @UserExist({ message: 'User not exist' })
  @ApiProperty()
  userId: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  description?: string;

  @IsBoolean()
  @ApiProperty()
  collaborator: boolean;
}
