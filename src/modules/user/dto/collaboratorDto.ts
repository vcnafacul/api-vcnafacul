import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserExist } from '../validator/user-exist.validator';

export class CollaboratorDtoInput {
  @IsNumber()
  @UserExist({ message: 'User not exist' })
  @ApiProperty()
  userId: number;

  @IsOptional()
  @IsString()
  @ApiProperty()
  description?: string;

  @IsBoolean()
  @ApiProperty()
  collaborator: boolean;
}
