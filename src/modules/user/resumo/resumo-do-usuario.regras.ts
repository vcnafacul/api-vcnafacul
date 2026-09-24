import { StatusApplication } from 'src/modules/prepCourse/studentCourse/enums/stastusApplication';

export interface InscricaoDoResumo {
  cursinho: { id: string; nome: string } | null;
  processo: { id: string; nome: string } | null;
  status: string;
  turma: string | null;
  em: Date;
}

/**
 * Atual × histórico das inscrições de estudante (card 04 de
 * `tela-de-usuarios`).
 *
 * ⚠️ **Decidido 2026-09-24:** atual = `Matriculado`; histórico = TODO o resto
 * — encerradas, canceladas, indeferidas, e também as em andamento (Em Análise,
 * Convocado para matrícula, Declarou Interesse…). O `status` de cada uma diz
 * qual; separar "em andamento" seria um terceiro grupo que ninguém pediu.
 */
export function separarInscricoes(inscricoes: InscricaoDoResumo[]): {
  atual: InscricaoDoResumo[];
  historico: InscricaoDoResumo[];
} {
  const atual = inscricoes.filter(
    (i) => i.status === StatusApplication.Enrolled,
  );
  const historico = inscricoes.filter(
    (i) => i.status !== StatusApplication.Enrolled,
  );
  return { atual, historico };
}
