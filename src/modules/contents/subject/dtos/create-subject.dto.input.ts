import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateSubjectDTOInput {
  @ApiProperty()
  @IsString() //Criar Verificacao se Frente Existe
  frente: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string = '';
}
