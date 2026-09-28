import { Injectable } from '@nestjs/common';
import { PartnerPrepCourseRepository } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.repository';

type ComDono = { cursinhoId?: string | null; cursinhoNome?: string | null };

/**
 * Acrescenta `cursinhoNome` às provas que vieram do ms (tickets/023, card
 * 07): o ms só sabe o `cursinhoId`, o nome está no MySQL. Uma consulta para a
 * lista inteira.
 */
@Injectable()
export class CursinhoNomeService {
  constructor(private readonly partners: PartnerPrepCourseRepository) {}

  async comNome<T extends ComDono>(provas: T[]): Promise<T[]> {
    const ids = [
      ...new Set(provas.map((p) => p?.cursinhoId).filter(Boolean)),
    ] as string[];
    const nomes = await this.partners.nomesPorId(ids);
    return provas.map((p) =>
      p?.cursinhoId
        ? { ...p, cursinhoNome: nomes.get(p.cursinhoId) ?? null }
        : p,
    );
  }
}
