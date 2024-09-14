import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSubjectDTOInput {
  @ApiProperty()
  @IsNumber() //Criar Verificacao se Frente Existe
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string = '';
}
