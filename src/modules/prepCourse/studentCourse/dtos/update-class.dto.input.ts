import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateClassDTOInput {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  classId: string;
}
