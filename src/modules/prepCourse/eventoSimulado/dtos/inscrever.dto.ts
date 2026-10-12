import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class InscreverDtoInput {
  /** Opcional quando o evento tem uma prova só. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  provaId?: string;

  /**
   * tickets/039: o simulado escolhido. Obrigatório quando a prova tem mais de
   * um (Enem Dia 1: Inglês ou Espanhol).
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  simuladoId?: string;
}
