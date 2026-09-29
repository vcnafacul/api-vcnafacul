import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager, Not } from 'typeorm';
import { CursinhoLink, TipoDeLink } from './cursinho-link.entity';
import { CursinhoPagina } from './cursinho-pagina.entity';

export type LinkNovo = { tipo: TipoDeLink; titulo: string; url: string };

@Injectable()
export class CursinhoPaginaRepository extends BaseRepository<CursinhoPagina> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(CursinhoPagina));
  }

  private comLinks(where: object) {
    return this.repository.findOne({
      where,
      relations: { links: true },
      order: { links: { ordem: 'ASC' } },
    });
  }

  findByCursinho(partnerPrepCourseId: string) {
    return this.comLinks({ partnerPrepCourseId });
  }

  findBySlug(slug: string) {
    return this.comLinks({ slug });
  }

  async slugEmUso(slug: string, excetoPaginaId?: string): Promise<boolean> {
    const where = excetoPaginaId ? { slug, id: Not(excetoPaginaId) } : { slug };
    return (await this.repository.count({ where })) > 0;
  }

  /** Grava a página e SUBSTITUI os links, numa transação. */
  async salvarComLinks(
    pagina: CursinhoPagina,
    links: LinkNovo[],
  ): Promise<void> {
    await this._entityManager.transaction(async (m) => {
      const salva = await m.save(CursinhoPagina, {
        id: pagina.id,
        partnerPrepCourseId: pagina.partnerPrepCourseId,
        slug: pagina.slug,
        quemSomos: pagina.quemSomos,
        active: pagina.active,
      });
      await m.delete(CursinhoLink, { paginaId: salva.id });
      if (links.length) {
        await m.insert(
          CursinhoLink,
          links.map((l, ordem) => ({ ...l, ordem, paginaId: salva.id })),
        );
      }
    });
  }
}
