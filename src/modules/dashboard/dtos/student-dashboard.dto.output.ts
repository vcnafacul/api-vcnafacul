export class StudentDashboardDtoOutput {
  cursinho: {
    name: string;
    logo: string | null;
  };
  matricula: string | null;
  turma: string | null;
  periodo: string | null;
  frequencia: {
    presencas: number;
    faltas: number;
    percentual: number;
  };
}
