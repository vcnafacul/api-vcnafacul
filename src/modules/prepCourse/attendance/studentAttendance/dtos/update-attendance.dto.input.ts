import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const aparado = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Editar a presença de um aluno (tickets-documentacao, card 05). */
export class UpdateAttendanceDtoInput {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsBoolean()
  present: boolean;

  /** Por que a presença foi alterada. Obrigatória; não é justificativa. */
  @ApiProperty()
  @Transform(aparado)
  @IsString()
  @IsNotEmpty({ message: 'Informe uma observação' })
  @MaxLength(255)
  observation: string;

  /**
   * Só vale para Ausente. Ausente: omitida mantém a atual; vazia remove; com
   * texto cria/substitui. Presente: a justificativa é sempre removida.
   */
  @ApiPropertyOptional()
  @Transform(aparado)
  @IsString()
  @IsOptional()
  @MaxLength(255)
  justification?: string;
}
