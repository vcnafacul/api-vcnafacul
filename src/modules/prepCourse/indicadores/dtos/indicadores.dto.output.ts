import { Metricas } from '../metricas';

export interface PeriodoDoIndicadorDtoOutput {
  id: string;
  nome: string;
  ano: number;
  /** `YYYY-MM-DD` */
  inicio: string;
  /** `YYYY-MM-DD` */
  fim: string;
  emAndamento: boolean;
}

export interface PeriodosDoCursinhoDtoOutput {
  periodos: PeriodoDoIndicadorDtoOutput[];
  /** Turmas sem período letivo — não entram nos números (R1). */
  turmasSemPeriodo: number;
}

export interface IndicadoresDtoOutput {
  periodo: PeriodoDoIndicadorDtoOutput;
  /** Quando os números foram calculados (ISO). */
  atualizadoEm: string;
  cursinho: Metricas;
  turmas: { id: string; nome: string; metricas: Metricas }[];
  /** Soma das turmas, um ponto por dia gravado (+ hoje, no período aberto). */
  serie: { dia: string; metricas: Metricas }[];
}

export interface AlunoSumindoDtoOutput {
  alunoId: string;
  nome: string;
  turma: string;
  /** `YYYY-MM-DD`; `null` se nunca veio. */
  ultimaPresenca: string | null;
  faltasSeguidas: number;
  /** Só para quem tem `gerenciarEstudantes` (R7). */
  telefone?: string | null;
}

export interface ResumoDosIndicadoresDtoOutput {
  /**
   * A pessoa é de um cursinho? A dashboard mantém o total da plataforma para
   * a equipe do projeto e o troca pelos indicadores para o cursinho.
   */
  cursinho: boolean;
  /** Os períodos em andamento somados (normalmente um). */
  periodos: { id: string; nome: string }[];
  /** `null` sem período em andamento (a dashboard esconde os KPIs). */
  metricas: Metricas | null;
}
