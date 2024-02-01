import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSubjectDTOInput {
  @ApiProperty()
  @IsNumber() //Criar Verificacao se Frente Existe
  frente: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string = '';
}
