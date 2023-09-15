import { ApiProperty } from '@nestjs/swagger';
import { ExameDTO } from './exame.dto.output';
import { Caderno } from '../enum/caderno.enum';
import { EnemArea } from '../enum/enem-area.enum';
import { FrenteDTO } from './frente.dto.outpur';
import { MateriaDTO } from './materia.dto.outpur';

export class QuestaoAnswerDTO {
  @ApiProperty()
  exame: ExameDTO;

  @ApiProperty()
  public ano: number;

  @ApiProperty()
  public caderno: Caderno;

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
