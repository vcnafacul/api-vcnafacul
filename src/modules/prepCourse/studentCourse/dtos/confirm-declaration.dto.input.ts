import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmDeclarationDtoInput {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;
}
