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
