import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

/** Espelho do enum do ms-simulado (tickets/042, D3). */
export enum MotivoAnulacao {
  enunciadoComErro = 'enunciado_com_erro',
  semAlternativaCorreta = 'sem_alternativa_correta',
  maisDeUmaCorreta = 'mais_de_uma_correta',
  repetidaDeOutroExame = 'repetida_de_outro_exame',
  foraDoEdital = 'fora_do_edital',
  outro = 'outro',
}

export const JUSTIFICATIVA_MIN = 10;
export const JUSTIFICATIVA_MAX = 500;

/**
 * Anular uma questão numa prova (tickets/042, card 06). ⚠️ A mesma validação
 * do ms: aqui é para o erro voltar antes de atravessar a rede, não para
 * substituir a de lá.
 */
export class AnularQuestaoDTOInput {
  @ApiProperty({ enum: MotivoAnulacao })
  @IsEnum(MotivoAnulacao, { message: 'Motivo da anulação inválido.' })
  motivo: MotivoAnulacao;

  @ApiProperty({ minLength: JUSTIFICATIVA_MIN, maxLength: JUSTIFICATIVA_MAX })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'A justificativa é obrigatória.' })
  @Length(JUSTIFICATIVA_MIN, JUSTIFICATIVA_MAX, {
    message: `A justificativa deve ter de ${JUSTIFICATIVA_MIN} a ${JUSTIFICATIVA_MAX} caracteres.`,
  })
  justificativa: string;
}

export const MODOS_DE_ENTRADA = ['normal', 'anulada'] as const;

/**
 * Adicionar questão à prova (tickets/023 + 042, D4). Sem `modo`, a questão já
 * anulada em outra prova volta com 409 `QUESTAO_ANULADA` — o modal do client.
 */
export class AdicionarEmProvaDTOInput {
  @ApiProperty()
  @IsString()
  provaId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  numero: number;

  @ApiProperty({ enum: MODOS_DE_ENTRADA, required: false })
  @IsOptional()
  @IsIn(MODOS_DE_ENTRADA)
  modo?: (typeof MODOS_DE_ENTRADA)[number];

  @ApiProperty({ type: AnularQuestaoDTOInput, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnularQuestaoDTOInput)
  anulacao?: AnularQuestaoDTOInput;
}
