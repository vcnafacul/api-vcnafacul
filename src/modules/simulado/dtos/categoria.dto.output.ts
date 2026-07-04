// src/modules/simulado/dtos/categoria.dto.output.ts
import { ApiProperty } from '@nestjs/swagger';
import { ExameDTO } from './exame.dto.output';

export class CategoriaDTO {
  @ApiProperty()
  public _id: string;

  @ApiProperty()
  public nome: string;

  @ApiProperty()
  public duracao: number;

  @ApiProperty({ nullable: true })
  public quantidadeTotalQuestao: number | null;

  @ApiProperty({ type: ExameDTO })
  public exame: ExameDTO;

  @ApiProperty()
  public custom: boolean;

  @ApiProperty()
  public selecionavel: boolean;

  @ApiProperty()
  public descricao: string;
}
