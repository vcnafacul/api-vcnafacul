import { ApiProperty } from '@nestjs/swagger';
import { QuestaoDTO } from './questao.dto.output';

export class QuestaoNaContainerDTO {
  @ApiProperty({ type: QuestaoDTO })
  public questao: QuestaoDTO;

  @ApiProperty({ nullable: true })
  public numero: number | null;
}
