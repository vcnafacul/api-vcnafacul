import { ApiProperty } from '@nestjs/swagger';
import { SituacaoDoConvite } from '../convite-colaborador.regras';

/** O que a página do link mostra antes do login (cards 04 e 05). */
export class ConvitePorTokenDtoOutput {
  @ApiProperty() nomeCursinho: string;
  @ApiProperty() funcao: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: ['pendente', 'expirado', 'aceito', 'cancelado'] })
  situacao: SituacaoDoConvite;
  @ApiProperty() expiraEm: Date;
  @ApiProperty({ description: 'já existe conta com o email convidado' })
  temConta: boolean;
}
