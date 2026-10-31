export class GetClassByIdAttendanceDtoOutput {
  id: string;
  name: string;
  coursePeriodId: string;
  coursePeriodName: string;
  coursePeriodYear: number;
  /** `null` = o cursinho não configurou o alerta (tickets/054, D5). */
  alertaEvasao: { percentual: number; minimoDeAulas: number } | null;
  students: StudentClassAttendance[];
}

export class StudentClassAttendance {
  id: string;
  name: string;
  cod_enrolled: string;
  /** Chamadas desta turma em que o aluno estava (tickets/054, R1). */
  aulas: number;
  /** Faltas sem justificativa, individual ou por período (R2). */
  faltasNaoJustificadas: number;
  /** Intervalos ativos, `YYYY-MM-DD`, inclusive (R4). */
  justificativasPorPeriodo: { inicio: string; fim: string }[];
}
