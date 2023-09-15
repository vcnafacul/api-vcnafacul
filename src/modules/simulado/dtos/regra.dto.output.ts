import { ApiProperty } from '@nestjs/swagger';
import { MateriaDTO } from './materia.dto.outpur';
import { FrenteDTO } from './frente.dto.outpur';

export class RegraDTO {
  @ApiProperty()
  materia: MateriaDTO;

  @ApiProperty()
  quantidade: number;

  @ApiProperty()
  frente?: FrenteDTO;

  @ApiProperty()
  ano?: number;

  @ApiProperty()
  caderno?: number;
}
