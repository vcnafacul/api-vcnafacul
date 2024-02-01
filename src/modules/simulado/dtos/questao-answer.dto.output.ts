import { ApiProperty } from '@nestjs/swagger';
import { EnemArea } from '../enum/enem-area.enum';
import { FrenteDTO } from './frente.dto.outpur';
import { MateriaDTO } from './materia.dto.outpur';

export class QuestaoAnswerDTO {
  @ApiProperty()
  public enemArea: EnemArea;

  @ApiProperty()
  public frente1: FrenteDTO;

  @ApiProperty()
  public frente2?: FrenteDTO;

  @ApiProperty()
  public frente3?: FrenteDTO;

  @ApiProperty()
  public materia: MateriaDTO;

  @ApiProperty()
  public numero: number;

  @ApiProperty()
  public imageId: string;
}
