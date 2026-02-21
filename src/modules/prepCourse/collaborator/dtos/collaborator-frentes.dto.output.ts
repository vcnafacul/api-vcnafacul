export class FrenteItemDto {
  id: string;
  nome: string;
  materia: number;
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
  materiaPId: string;
  materiaNome: string;
  adicionadoEm: Date;
}
