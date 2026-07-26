import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoriaDtoInput {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prefixo?: string;

  @ApiProperty()
  @IsNumber()
  duracao: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  quantidadeTotalQuestao?: number | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  exame: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;
}
