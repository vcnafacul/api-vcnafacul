import { ApiProperty } from '@nestjs/swagger';
import { SituacaoDoConvite } from '../convite-colaborador.regras';

/** Um convite como a tela de convites mostra (card 06). */
export class ConviteDtoOutput {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() funcao: { id: string; nome: string };
  @ApiProperty() convidadoPor: string;
  @ApiProperty({ enum: ['pendente', 'expirado', 'aceito', 'cancelado'] })
  situacao: SituacaoDoConvite;
  @ApiProperty() expiraEm: Date;
  @ApiProperty() createdAt: Date;
}
