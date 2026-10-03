/**
 * Os motivos que o cursinho escolhe ao cancelar uma matrícula. Cópia de
 * `ENROLLMENT_CANCELLATION_REASONS` do client
 * (`src/enums/prepCourse/enrollmentCancellationReason.ts`), que grava o
 * rótulo tal qual no histórico do aluno — mudar a redação lá exige mudar aqui.
 */
export const MOTIVOS_DE_CANCELAMENTO = [
  'Rotina',
  'Transporte',
  'Motivos pessoais',
  'Desistência inicial',
  'Abandono',
  'Não informou o motivo',
] as const;

export const MOTIVO_DESISTENCIA_INICIAL = 'Desistência inicial';
/** O client grava "Outros: <texto livre>". */
export const PREFIXO_OUTROS = 'Outros: ';
export const MOTIVO_OUTROS = 'Outros';
/** Cancelamentos de antes da lista, com texto livre. */
export const MOTIVO_FORA_DA_LISTA = 'Sem motivo na lista';

/** O motivo de um cancelamento, a partir do texto gravado no histórico. */
export function motivoDoCancelamento(descricao: string | null): string {
  const texto = (descricao ?? '').trim();
  if ((MOTIVOS_DE_CANCELAMENTO as readonly string[]).includes(texto))
    return texto;
  if (texto.startsWith(PREFIXO_OUTROS) || texto === 'Outros (especifique)')
    return MOTIVO_OUTROS;
  return MOTIVO_FORA_DA_LISTA;
}
