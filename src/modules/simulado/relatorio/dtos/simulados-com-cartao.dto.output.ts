import { ApiProperty } from '@nestjs/swagger';

/**
 * Espelha o DTO do ms-simulado. Redeclarado porque os repositórios são
 * separados e o tipo de lá não é importável — a mesma razão pela qual
 * `QuestoesDoRelatorioDtoOutput` existe duas vezes.
 */
export class SimuladoComCartaoDtoOutput {
  @ApiProperty()
  simuladoId: string;

  /** `null` quando o simulado foi apagado depois do vínculo. */
  @ApiProperty({ nullable: true })
  nome: string | null;

  /** Quantos ESTUDANTES enviaram cartão, não quantas fotos chegaram. */
  @ApiProperty()
  cartoes: number;

  @ApiProperty()
  comLeituraConcluida: number;

  /**
   * Quando o estudante mais recente entrou no recorte. Reenvio do mesmo
   * estudante não move esta data — não exibir como "última atividade".
   */
  @ApiProperty({ nullable: true })
  ultimoEnvio: Date | null;
}

export class SimuladosComCartaoDtoOutput {
  @ApiProperty({ type: [SimuladoComCartaoDtoOutput] })
  simulados: SimuladoComCartaoDtoOutput[];
}
