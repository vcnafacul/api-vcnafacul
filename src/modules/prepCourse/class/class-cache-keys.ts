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
  return `presence_by_class_id_${classId}`;
}

/** Lista de estudantes com a matricula cancelada, com email NAO mascarado. */
export function cancelledStudentsByClassIdKey(classId: string) {
  return `cancelled_students_by_class_id_${classId}`;
}
