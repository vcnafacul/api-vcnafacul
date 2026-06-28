import { EdicaoProva } from '../enum/edicao-prova.enum';

export class CreateProvaDTORequest {
  edicao: string = EdicaoProva.Regular;
  aplicacao: number = 1;
  ano: number;
  categoria: string;
  filename: string;
  gabarito: string;
}
