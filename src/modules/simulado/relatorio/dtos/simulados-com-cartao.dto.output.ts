import { ApiProperty } from '@nestjs/swagger';

/**
 * Espelha o DTO do ms-simulado. Redeclarado porque os repositórios são
 * separados e o tipo de lá não é importável — a mesma razão pela qual
 * `QuestoesDoRelatorioDtoOutput` existe duas vezes.
 */
export class SimuladoComCartaoDtoOutput {
  @ApiProperty()
  simuladoId: string;

  /**
   * `null` só se o documento do `Simulado` sumir da coleção. O delete da
   * aplicação é **soft** (`deleted: true`), e o nome continua vindo — de
   * propósito: esconder cartões que existem é pior que rotulá-los.
   */
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
   *
   * ⚠️ **String aqui, `Date` no ms.** Do outro lado do HTTP isto é um `Date`
   * de verdade; o que chega nesta api é o JSON já desserializado, onde é uma
   * string ISO. Tipar como `Date` compila (o proxy faz `as` sobre `unknown`)
   * e quebra em runtime no primeiro `.getTime()`.
   */
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  ultimoEnvio: string | null;
}

export class SimuladosComCartaoDtoOutput {
  @ApiProperty({ type: [SimuladoComCartaoDtoOutput] })
  simulados: SimuladoComCartaoDtoOutput[];
}
