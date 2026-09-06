import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import {
  Filter,
  GetAllInput,
  Sort,
} from 'src/shared/modules/base/interfaces/get-all.input';
import { StatusApplication } from '../enums/stastusApplication';

export class GetEnrolleds implements GetAllInput {
  @ApiProperty({ default: 1, required: false })
  @IsOptional()
  page: number = 1;

  @ApiProperty({ default: 30, required: false })
  @IsOptional()
  limit: number = 30;

  @ApiProperty({ required: false })
  @IsOptional()
  filter?: Filter | undefined;

  @ApiProperty({ required: false })
  @IsOptional()
  sort?: Sort;

  @ApiProperty({ required: false })
  @IsOptional()
  inscriptionId?: string;

  @ApiProperty({
    required: false,
    description: 'Ano letivo do período da turma do estudante',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiProperty({
    required: false,
    enum: StatusApplication,
    description:
      'Status da matrícula. Dentro deste universo apenas Matriculado, Matrícula Cancelada e Matrícula Encerrada ocorrem.',
  })
  @IsOptional()
  @IsEnum(StatusApplication)
  applicationStatus?: StatusApplication;

  @ApiProperty({
    required: false,
    description:
      'Colunas da exportacao, separadas por virgula. Usado apenas em /enrolled/export; sem ele a exportacao usa a selecao padrao. Coluna fora do catalogo responde 400.',
  })
  @IsOptional()
  @IsString()
  columns?: string;
}
