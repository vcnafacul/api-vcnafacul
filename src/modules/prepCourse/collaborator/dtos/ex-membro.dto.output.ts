import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Um ex-membro do cursinho (tickets/040, card 05).
 *
 * ⚠️ Sem email nem telefone, de propósito (LGPD): a pessoa saiu do cursinho.
 */
export class ExMembroDtoOutput {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiPropertyOptional() foto: string | null;
  @ApiProperty() entrada: Date;
  @ApiProperty() saida: Date;
  @ApiPropertyOptional() funcaoQueTinha: string | null;
  @ApiPropertyOptional() funcaoDada: string | null;
  @ApiPropertyOptional() excluidoPor: string | null;
}
