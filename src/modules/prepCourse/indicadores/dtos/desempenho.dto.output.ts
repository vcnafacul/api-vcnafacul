export interface AplicacaoDtoOutput {
  simuladoId: string;
  nome: string;
  /** Primeiro envio de cartão (ISO) — a data da aplicação. */
  em: string | null;
  /** Aproveitamento médio de quem foi lido, 0..100; `null` sem leitura. */
  media: number | null;
  participantes: number;
}

export interface MesDeDesempenhoDtoOutput {
  /** `YYYY-MM` */
  mes: string;
  /** Todos os simulados concluídos no mês (online e cartão). */
  simulados: { participantes: number; media: number | null };
  /** Redações corrigidas no mês; nota 0..1000. */
  redacao: { corrigidas: number; media: number | null };
}

export interface DesempenhoDtoOutput {
  aplicacoes: AplicacaoDtoOutput[];
  porTurma: {
    turmaId: string;
    ultimaAplicacao: { nome: string; media: number | null } | null;
  }[];
  porMes: MesDeDesempenhoDtoOutput[];
}
