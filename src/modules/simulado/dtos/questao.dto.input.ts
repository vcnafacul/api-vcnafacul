import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { Status } from '../enum/status.enum';

/** tickets/043: as flags de revisão que o ms filtra (mesma lista do ms). */
const REVISOES = [
  'provaClassification',
  'subjectClassification',
  'reported',
  'textClassification',
  'alternativeClassfication',
].join('|');

export class QuestaoDTOInput extends GetAllDtoInput {
  @ApiProperty()
  @IsOptional()
  @IsNumberString()
  status?: Status | undefined;

  @ApiProperty({ default: '' })
  @IsString()
  materia: string = '';

  @ApiProperty({ default: '' })
  @IsString()
  frente: string = '';

  @ApiProperty({ default: '' })
  @IsString()
  prova: string = '';

  @ApiProperty({ default: '' })
  @IsString()
  enemArea: string = '';

  @ApiProperty()
  @IsString()
  @IsOptional()
  text: string = '';

  /** Só as sinalizadas para revisão (tickets/024, card 04). */
  @ApiProperty({ required: false, enum: ['true'] })
  @IsOptional()
  @IsIn(['true'])
  reported?: 'true';

  /** tickets/042, card 06: repassado ao ms — `todas`, `esconder` ou `somente`. */
  @ApiProperty({ required: false, enum: ['todas', 'esconder', 'somente'] })
  @IsOptional()
  @IsIn(['todas', 'esconder', 'somente'])
  anulada?: 'todas' | 'esconder' | 'somente';

  /**
   * tickets/043, card 02: repassados ao ms. ⚠️ Sem estar aqui, o
   * `ValidationPipe` com `whitelist` descarta o parâmetro calado.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  exame?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  categoria?: string;

  /** tickets/043, card 09: ano da prova. */
  @ApiProperty({ required: false, example: '2023' })
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'ano deve ter 4 dígitos' })
  ano?: string;

  /** Flags de revisão separadas por vírgula, todas exigidas ("e"). */
  @ApiProperty({ required: false, example: 'textClassification,reported' })
  @IsOptional()
  @Matches(new RegExp(`^(${REVISOES})(,(${REVISOES}))*$`), {
    message: 'revisoes com flag desconhecida',
  })
  revisoes?: string;

  @ApiProperty({ required: false, enum: ['true'] })
  @IsOptional()
  @IsIn(['true'])
  semImagem?: 'true';
}
