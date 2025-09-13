import { ApiProperty } from '@nestjs/swagger';

export class ContentStatsByFrenteDtoOutput {
  @ApiProperty({ description: 'ID da matéria' })
  materia: number;

  @ApiProperty({ description: 'Nome da frente' })
  frente: string;

  @ApiProperty({ description: 'Número de conteúdos pendentes (status 0)' })
  pendentes: number;

  @ApiProperty({ description: 'Número de conteúdos aprovados (status 1)' })
  aprovados: number;

  @ApiProperty({ description: 'Número de conteúdos reprovados (status 2)' })
  reprovados: number;

  @ApiProperty({ description: 'Número de conteúdos pendentes de upload (status 3)' })
  pendentes_upload: number;

  @ApiProperty({ description: 'Total de conteúdos' })
  total: number;
}
