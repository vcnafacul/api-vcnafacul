import { ApiProperty } from '@nestjs/swagger';
import { Alternativa } from '../enum/alternativa.enum';
import { EnemArea } from '../enum/enem-area.enum';
import { Status } from '../enum/status.enum';
import { FrenteDTO } from './frente.dto.outpur';
import { MateriaDTO } from './materia.dto.outpur';

export class QuestaoDTO {
  @ApiProperty()
  public _id?: string;

  @ApiProperty({ enum: EnemArea })
  public enemArea: EnemArea;

  @ApiProperty()
  public frente1: FrenteDTO;

  @ApiProperty()
  public frente2: FrenteDTO;

  @ApiProperty()
  public frente3: FrenteDTO;

  @ApiProperty()
  public materia: MateriaDTO;

  @ApiProperty()
  public numero: number;

  @ApiProperty()
  public textoQuestao: string;

  @ApiProperty()
  public textoAlternativaA: string;

  @ApiProperty()
  public textoAlternativaB: string;

  @ApiProperty()
  public textoAlternativaC: string;

  @ApiProperty()
  public textoAlternativaD: string;

  @ApiProperty()
  public textoAlternativaE: string;

  @ApiProperty()
  public alternativa: Alternativa;

  @ApiProperty()
  public imageId: string;

  @ApiProperty()
  public acertos: number;

  @ApiProperty()
  public quantidadeSimulado: number;

  @ApiProperty()
  public quantidadeResposta: number;

  @ApiProperty()
  public status: Status;

  @ApiProperty()
  public provaClassification: boolean;

  @ApiProperty()
  public subjectClassification: boolean;

  @ApiProperty()
  public textClassification: boolean;

  @ApiProperty()
  public imageClassfication: boolean;

  @ApiProperty()
  public alternativeClassfication: boolean;

  @ApiProperty()
  public reported: boolean;
}
