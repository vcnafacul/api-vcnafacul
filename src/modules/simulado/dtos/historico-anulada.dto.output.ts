import { ApiProperty } from '@nestjs/swagger';
import { MotivoAnulacao } from './anulacao.dto.input';

/**
 * O que o histórico do aluno traz sobre anulação (tickets/042, card 10). A
 * api repassa o objeto do ms sem tocar: este DTO é só o contrato no Swagger.
 */
export class AnulacaoDaQuestaoNoHistoricoDTO {
  @ApiProperty({ enum: MotivoAnulacao })
  motivo: MotivoAnulacao;

  @ApiProperty()
  justificativa: string;
}

export class HistoricoComAnuladaDTO {
  @ApiProperty({
    description:
      'A nota foi calculada antes da última anulação/desanulação do simulado. Histórico digital é recalculado ao abrir; o de cartão espera o relatório do cursinho.',
  })
  divergente: boolean;

  @ApiProperty({ required: false, description: 'Total sem as anuladas.' })
  totalConsiderado?: number;

  @ApiProperty({ required: false, type: [Number] })
  numerosAnulados?: number[];

  @ApiProperty({
    required: false,
    description: 'Quando a nota foi recalculada por anulação.',
  })
  recalculadoEm?: Date;

  @ApiProperty({
    description:
      '`simulado.questoes[]` ganha `anulada` e, quando anulada, `anulacao` ({ motivo, justificativa }); `respostas[]` ganha `anulada`.',
  })
  simulado: unknown;
}
