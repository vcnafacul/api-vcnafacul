export class MateriaCountDto {
  materiaId: string;
  materiaName: string;
  count: number;
}

export class QuestoesPendentesDashboardDtoOutput {
  total: number;
  byMateria: MateriaCountDto[];
}
