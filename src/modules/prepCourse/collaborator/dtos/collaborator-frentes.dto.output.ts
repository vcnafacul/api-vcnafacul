export class FrenteItemDto {
  id: string;
  nome: string;
  /** Id da matéria (preenchido pela resposta do ms-simulado na consulta de frentes). */
  materia: string;
}

export class MateriaItemDto {
  id: string;
  nome: string;
}

export class CollaboratorFrentesDtoOutput {
  collaboratorId: string;
  frentes: FrenteItemDto[];
  materias: MateriaItemDto[];
}

export class AfinidadeDto {
  frenteId: string;
  frenteNome: string;
  /** Id da matéria (vindo da frente no ms-simulado); uso principal: key em listas no frontend. */
  materiaId: string;
  materiaNome: string;
  adicionadoEm: Date;
}
