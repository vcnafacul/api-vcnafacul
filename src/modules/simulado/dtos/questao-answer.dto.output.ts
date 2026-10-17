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

  @ApiProperty({ nullable: true })
  public numero: number | null;

  /** tickets/042 (D5): anulada — a tela marca e pula, e não há imagem. */
  @ApiProperty({ required: false })
  public anulada?: boolean;

  @ApiProperty({ required: false, description: 'Ausente na questão anulada.' })
  public imageId?: string;
}
