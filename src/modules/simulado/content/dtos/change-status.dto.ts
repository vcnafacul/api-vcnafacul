import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { StatusContent } from '../enums/status-content.enum';

export class ChangeStatusDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ enum: StatusContent })
  @IsEnum(StatusContent)
  status: StatusContent;

  /**
   * Obrigatório ao rejeitar: o ms recusa `Rejected` sem motivo (048/03), e é
   * o que quem enviou o material lê para saber o que corrigir.
   *
   * ⚠️ Sem `@IsOptional`: ele ignora `undefined` ANTES do `ValidateIf` e
   * deixava rejeitar sem motivo passar. Fora de `Rejected` o `ValidateIf`
   * já pula tudo, então ausente continua ok.
   */
  @ApiProperty({ required: false, description: 'obrigatório em Rejected' })
  @ValidateIf((o) => o.status === StatusContent.Rejected)
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo da rejeição.' })
  @MaxLength(1000)
  reason?: string;
}
