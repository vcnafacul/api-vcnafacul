/**
 * Uma matrícula ativa por usuário, somando todos os cursinhos (tickets/035).
 *
 * O usuário pode ter vários `student_course` (um por inscrição) — e deve: ele
 * pode se inscrever no processo do ano seguinte, ou nas vagas remanescentes. O
 * que não pode é ficar `Matriculado` em dois ao mesmo tempo. Com dois, o
 * relatório do cartão lista o aluno duas vezes e conta o cartão duas vezes, e
 * quem busca "a" matrícula dele (`findEnrolledByUserId`) pega uma qualquer.
 */

/** O que a mensagem precisa saber da matrícula que já existe. */
export interface MatriculaAtivaExistente {
  cursinho: string | null;
  periodo: {
    nome: string;
    ano: number;
    inicio: Date;
    fim: Date;
  } | null;
}

/**
 * "26/03/2025" — lida em **UTC**, e não no fuso de São Paulo.
 *
 * ⚠️ O período letivo é uma data de calendário gravada à meia-noite UTC
 * (`2025-03-26T00:00:00Z`, conferido em homol). No fuso de São Paulo isso é
 * 25/03 às 21h, e a mensagem mostraria o dia anterior.
 */
function data(d: Date): string {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * ⚠️ **O período letivo entra quando existe**: é o que diz à coordenação até
 * quando a outra matrícula vale — e, portanto, quando este aluno poderá ser
 * matriculado aqui. Sem turma (ou turma sem período), a frase para no cursinho.
 */
export function mensagemDeMatriculaAtiva(
  acao: 'matricular' | 'reativar a matrícula',
  existente: MatriculaAtivaExistente,
): string {
  const cursinho = existente.cursinho?.trim() || 'outro cursinho';
  const p = existente.periodo;
  const periodo = p
    ? `, no período letivo "${p.nome}" (${p.ano}), de ${data(p.inicio)} a ${data(p.fim)}`
    : '';
  return `Não é possível ${acao}: o estudante já possui matrícula ativa no cursinho ${cursinho}${periodo}.`;
}
