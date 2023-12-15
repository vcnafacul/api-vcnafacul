import { EdicaoProva } from '../enum/edicao-prova.enum';

export class CreateProvaDTORequest {
  edicao: string = EdicaoProva.Regular;
  aplicacao: number = 1;
  ano: number;
  exame: string;
  totalQuestao: number = 0;
  filename: string;
}
