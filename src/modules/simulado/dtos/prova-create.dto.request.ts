import { EdicaoProva } from '../enum/edicao-prova.enum';

export class CreateProvaDTORequest {
  edicao: string = EdicaoProva.Regular;
  aplicacao: number = 1;
  ano: number;
  categoria: string;
  filename?: string;
  gabarito?: string;
  nome?: string;
  nomeSimulado?: string;
  // Campos internos, injetados pelo api-vcnafacul (não vêm do cliente).
  criadorId: string;
  cursinhoId: string | null = null;
}
