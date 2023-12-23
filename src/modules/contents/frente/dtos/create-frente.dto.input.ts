import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { Materias } from '../enum/materias';

export class CreateFrenteDTOInput {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: Materias })
  @IsEnum(Materias)
  materia: Materias;
}
