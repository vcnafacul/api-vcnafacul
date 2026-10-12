/**
 * Chaves de cache da tela de Turma.
 *
 * Ficam aqui, e nao inline em cada servico, porque quem escreve a chave
 * (ClassService) e quem a derruba (StudentCourseService) sao modulos
 * diferentes — uma divergencia de string entre os dois nao daria erro de
 * compilacao, so cache que nunca invalida.
 *
 * Importar o proprio ClassService no StudentCourseService so para reaproveitar
 * a string criaria dependencia circular.
 */

/** Payload da turma com a lista de estudantes ativos e as metricas de presenca. */
export function presenceByClassIdKey(classId: string) {
  // v2: a lista passou a trazer os encerrados — sem trocar a chave, o
  // payload antigo (só Matriculados) seguiria no cache por até 7 dias.
  return `presence_by_class_id_v2_${classId}`;
}

/** Lista de estudantes com a matricula cancelada, com email NAO mascarado. */
export function cancelledStudentsByClassIdKey(classId: string) {
  return `cancelled_students_by_class_id_${classId}`;
}
